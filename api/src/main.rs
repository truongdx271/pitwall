use std::env;
use std::sync::Arc;

use anyhow::Error;
use axum::{
    Router,
    http::{HeaderValue, Method},
    routing::get,
};

use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tracing::info;

use shared::tracing_subscriber;

mod endpoints {
    pub(crate) mod health;
    pub(crate) mod radio;
    pub(crate) mod schedule;
}

mod radio;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber();

    let addr = env::var("ADDRESS").unwrap_or_else(|_| "0.0.0.0:80".to_string());

    let transcriber = radio::Transcriber::from_env().map(Arc::new);
    if transcriber.is_none() {
        info!("GROQ_API_KEY not set, radio transcripts disabled");
    }

    let app = Router::new()
        .route("/api/schedule", get(endpoints::schedule::get))
        .route("/api/schedule/next", get(endpoints::schedule::get_next))
        .route("/api/radio/transcript", get(endpoints::radio::get_transcript))
        .route("/api/health", get(endpoints::health::check))
        .with_state(transcriber);

    info!(addr, "starting api http server");

    axum::serve(TcpListener::bind(addr).await?, app).await?;

    Ok(())
}

pub fn cors_layer() -> Result<CorsLayer, anyhow::Error> {
    let origin = env::var("ORIGIN").unwrap_or_else(|_| "https://f1-dash.com".to_string());

    let origins = origin
        .split(';')
        .filter_map(|o| HeaderValue::from_str(o).ok())
        .collect::<Vec<HeaderValue>>();

    Ok(CorsLayer::new()
        .allow_origin(origins)
        .allow_methods([Method::GET, Method::CONNECT]))
}
