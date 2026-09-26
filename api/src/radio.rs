use std::collections::HashMap;
use std::env;
use std::fmt;
use std::path::PathBuf;
use std::sync::{Arc, LazyLock};
use std::time::Duration;

use regex::Regex;
use reqwest::StatusCode;
use reqwest::multipart::{Form, Part};
use serde::Deserialize;
use tokio::sync::{Mutex, OnceCell, Semaphore};
use tracing::warn;

const STATIC_BASE: &str = "https://livetiming.formula1.com/static/";
const GROQ_URL: &str = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL: &str = "whisper-large-v3";
// Free tier allows 20 req/min; a cold session can ask for 20 clips at once.
const MAX_CONCURRENT_CALLS: usize = 2;

static CLIP_PATH: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^\d{4}/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/TeamRadio/[A-Z]{3}_\d{1,2}_\d{8}_\d{6}\.mp3$")
        .unwrap()
});

/// `path` is `SessionInfo.Path + Capture.Path`, e.g.
/// `2026/2026-05-24_Canadian_Grand_Prix/2026-05-24_Race/TeamRadio/LEC_16_20260524_130022.mp3`.
pub fn is_valid_clip_path(path: &str) -> bool {
    CLIP_PATH.is_match(path)
}

pub fn cache_file_name(path: &str) -> String {
    path.trim_end_matches(".mp3").replace('/', "__") + ".txt"
}

#[derive(Debug)]
pub enum TranscribeError {
    RateLimited { retry_after: Option<u64> },
    Upstream(String),
}

impl fmt::Display for TranscribeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::RateLimited { retry_after } => write!(f, "rate limited (retry after {retry_after:?}s)"),
            Self::Upstream(msg) => write!(f, "{msg}"),
        }
    }
}

fn upstream(e: impl fmt::Display) -> TranscribeError {
    TranscribeError::Upstream(e.to_string())
}

#[derive(Deserialize)]
struct GroqResponse {
    text: String,
}

pub fn parse_groq_response(body: &str) -> Result<String, TranscribeError> {
    serde_json::from_str::<GroqResponse>(body)
        .map(|r| r.text.trim().to_owned())
        .map_err(|e| upstream(format!("bad groq response: {e}")))
}

pub struct Transcriber {
    http: reqwest::Client,
    api_key: String,
    cache_dir: PathBuf,
    // One cell per clip being transcribed, so concurrent requests share one Groq call.
    inflight: Mutex<HashMap<String, Arc<OnceCell<String>>>>,
    permits: Semaphore,
}

impl Transcriber {
    pub fn new(api_key: String, cache_dir: PathBuf) -> Self {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("reqwest client");

        Self {
            http,
            api_key,
            cache_dir,
            inflight: Mutex::new(HashMap::new()),
            permits: Semaphore::new(MAX_CONCURRENT_CALLS),
        }
    }

    /// None when `GROQ_API_KEY` is unset or empty: transcripts are then disabled.
    pub fn from_env() -> Option<Self> {
        let api_key = env::var("GROQ_API_KEY").ok().filter(|k| !k.trim().is_empty())?;
        let cache_dir = env::var("TRANSCRIPT_CACHE_DIR").unwrap_or_else(|_| "./transcripts".to_string());
        Some(Self::new(api_key, PathBuf::from(cache_dir)))
    }

    pub async fn transcript(&self, path: &str) -> Result<String, TranscribeError> {
        if let Some(text) = self.read_cache(path).await {
            return Ok(text);
        }

        let cell = self.inflight.lock().await.entry(path.to_owned()).or_default().clone();

        let result = cell
            .get_or_try_init(|| async {
                if let Some(text) = self.read_cache(path).await {
                    return Ok(text);
                }
                let text = self.call_groq(path).await?;
                self.write_cache(path, &text).await;
                Ok(text)
            })
            .await
            .cloned();

        self.inflight.lock().await.remove(path);
        result
    }

    async fn call_groq(&self, path: &str) -> Result<String, TranscribeError> {
        let _permit = self.permits.acquire().await.map_err(upstream)?;

        let audio = self
            .http
            .get(format!("{STATIC_BASE}{path}"))
            .send()
            .await
            .and_then(|r| r.error_for_status())
            .map_err(upstream)?
            .bytes()
            .await
            .map_err(upstream)?;

        let file = Part::bytes(audio.to_vec())
            .file_name("clip.mp3")
            .mime_str("audio/mpeg")
            .map_err(upstream)?;

        let form = Form::new()
            .part("file", file)
            .text("model", MODEL)
            .text("language", "en")
            .text("temperature", "0")
            .text("response_format", "json");

        let res = self
            .http
            .post(GROQ_URL)
            .bearer_auth(&self.api_key)
            .multipart(form)
            .send()
            .await
            .map_err(upstream)?;

        if res.status() == StatusCode::TOO_MANY_REQUESTS {
            let retry_after = res
                .headers()
                .get("retry-after")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.trim_end_matches('s').parse::<f64>().ok())
                .map(|s| s.ceil() as u64);
            return Err(TranscribeError::RateLimited { retry_after });
        }

        let status = res.status();
        let body = res.text().await.map_err(upstream)?;

        if !status.is_success() {
            return Err(upstream(format!("groq returned {status}: {body}")));
        }

        parse_groq_response(&body)
    }

    async fn read_cache(&self, path: &str) -> Option<String> {
        tokio::fs::read_to_string(self.cache_dir.join(cache_file_name(path))).await.ok()
    }

    pub(crate) async fn write_cache(&self, path: &str, text: &str) {
        let file = self.cache_dir.join(cache_file_name(path));
        let tmp = file.with_extension("tmp");

        let result = async {
            tokio::fs::create_dir_all(&self.cache_dir).await?;
            tokio::fs::write(&tmp, text).await?;
            tokio::fs::rename(&tmp, &file).await
        }
        .await;

        if let Err(e) = result {
            warn!(path, error = %e, "failed to cache transcript");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const REAL: &str =
        "2026/2026-05-24_Canadian_Grand_Prix/2026-05-24_Race/TeamRadio/LEC_16_20260524_130022.mp3";

    #[test]
    fn accepts_real_clip_paths() {
        assert!(is_valid_clip_path(REAL));
        assert!(is_valid_clip_path(
            "2026/2026-05-22_Canadian_Grand_Prix/2026-05-22_Practice_1/TeamRadio/NOR_1_20260522_124627.mp3"
        ));
    }

    #[test]
    fn rejects_anything_else() {
        for bad in [
            "",
            "TeamRadio/LEC_16_20260524_130022.mp3",
            "2026/../../etc/TeamRadio/LEC_16_20260524_130022.mp3",
            "2026/a/b/TeamRadio/LEC_16_20260524_130022.mp3?x=1",
            "2026/a/b/TeamRadio/LEC_16_20260524_130022.wav",
            "https://evil.example/2026/a/b/TeamRadio/LEC_16_20260524_130022.mp3",
            "2026/a/b/Other/LEC_16_20260524_130022.mp3",
        ] {
            assert!(!is_valid_clip_path(bad), "{bad} should be rejected");
        }
    }

    #[test]
    fn cache_file_name_is_flat() {
        assert_eq!(
            cache_file_name(REAL),
            "2026__2026-05-24_Canadian_Grand_Prix__2026-05-24_Race__TeamRadio__LEC_16_20260524_130022.txt"
        );
    }

    #[test]
    fn parses_and_trims_groq_text() {
        let text = parse_groq_response(r#"{"text":"  Copy that, Max. ","x_groq":{"id":"req_1"}}"#).unwrap();
        assert_eq!(text, "Copy that, Max.");
    }

    #[test]
    fn rejects_malformed_groq_body() {
        assert!(matches!(parse_groq_response("nope"), Err(TranscribeError::Upstream(_))));
    }

    #[tokio::test]
    async fn serves_cached_transcript_without_calling_groq() {
        let dir = std::env::temp_dir().join(format!("pitwall-radio-test-{}", std::process::id()));
        // Empty key: any real Groq call would fail, so Ok proves the cache was used.
        let t = Transcriber::new(String::new(), dir.clone());
        t.write_cache(REAL, "Box box.").await;
        assert_eq!(t.transcript(REAL).await.unwrap(), "Box box.");
        let _ = std::fs::remove_dir_all(dir);
    }
}
