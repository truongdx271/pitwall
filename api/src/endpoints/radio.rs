use std::sync::Arc;

use axum::{
    Json,
    extract::{Query, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::radio::{self, TranscribeError, Transcriber};

#[derive(Deserialize)]
pub struct Params {
    path: String,
}

#[derive(Serialize)]
struct TranscriptBody {
    text: String,
}

pub async fn get_transcript(
    State(transcriber): State<Option<Arc<Transcriber>>>,
    Query(params): Query<Params>,
) -> Response {
    let Some(transcriber) = transcriber else {
        return StatusCode::NOT_IMPLEMENTED.into_response();
    };

    if !radio::is_valid_clip_path(&params.path) {
        return StatusCode::BAD_REQUEST.into_response();
    }

    match transcriber.transcript(&params.path).await {
        Ok(text) => (
            [(header::CACHE_CONTROL, "public, max-age=86400")],
            Json(TranscriptBody { text }),
        )
            .into_response(),
        Err(TranscribeError::RateLimited { retry_after }) => (
            StatusCode::SERVICE_UNAVAILABLE,
            [(header::RETRY_AFTER, retry_after.unwrap_or(10).to_string())],
        )
            .into_response(),
        Err(e) => {
            error!(path = params.path, error = %e, "transcription failed");
            StatusCode::BAD_GATEWAY.into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn params(path: &str) -> Query<Params> {
        Query(Params { path: path.to_owned() })
    }

    #[tokio::test]
    async fn disabled_without_key() {
        let res = get_transcript(State(None), params("anything")).await;
        assert_eq!(res.status(), StatusCode::NOT_IMPLEMENTED);
    }

    #[tokio::test]
    async fn rejects_invalid_path() {
        let t = Arc::new(Transcriber::new("k".into(), std::env::temp_dir()));
        let res = get_transcript(State(Some(t)), params("../../etc/passwd")).await;
        assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    }
}
