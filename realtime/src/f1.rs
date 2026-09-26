use std::time::Duration;

use anyhow::{anyhow, Error};
use serde_json::json;
use tokio::sync::broadcast::Sender;
use tokio_stream::StreamExt;
use tracing::{error, trace, warn};

use crate::services::state_service::StateService;

const URL: &str = "livetiming.formula1.com/signalrcore";
const HUB: &str = "Streaming";

// The server pings every ~15s; this long without any frame means the socket is dead.
const IDLE_TIMEOUT: Duration = Duration::from_secs(60);

const TOPICS: [&str; 18] = [
    "Heartbeat",
    "CarData.z",
    "Position.z",
    "ExtrapolatedClock",
    "TimingStats",
    "TimingAppData",
    "WeatherData",
    "TrackStatus",
    "SessionStatus",
    "DriverList",
    "RaceControlMessages",
    "SessionInfo",
    "SessionData",
    "LapCount",
    "TimingData",
    "TeamRadio",
    "ChampionshipPrediction",
    "TopThree",
];

pub async fn ingest_f1(
    state_service: StateService,
    update_sender: Sender<String>,
) -> Result<(), Error> {
    let mut client = signalr::create_client(URL, HUB).await?;

    let initial = signalr::subscribe(&mut client, &TOPICS).await?;
    state_service.set_state(initial).await?;

    let mut stream = signalr::listen(client);

    loop {
        let items = match tokio::time::timeout(IDLE_TIMEOUT, stream.next()).await {
            Ok(Some(items)) => items,
            Ok(None) => break,
            Err(_) => return Err(anyhow!("no frames from F1 for {IDLE_TIMEOUT:?}, reconnecting")),
        };

        for update in items {
            trace!(?update.topic, "received update");

            if update.topic == "SessionInfo" && update.data.pointer("/Name").is_some() {
                warn!("received SessionInfo event, restarting...");
                return Ok(());
            }

            let payload = json!({ update.topic: update.data });

            if let Err(err) = update_sender.send(payload.to_string()) {
                error!(?err, "failed to send update");
            }

            if let Err(err) = state_service.update_state(payload).await {
                error!(?err, "failed to update state");
            }
        }
    }

    Ok(())
}
