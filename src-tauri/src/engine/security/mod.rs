// Conflux Engine — Security Module
// Mission 1224: Consumer Agent Security
// Permission gates, SIEM event logging, anomaly detection

pub mod agent_audit;
pub mod aegis;
pub mod anomaly;
pub mod events;
pub mod permissions;
pub mod platform;
pub mod siem;
pub mod viper;
#[cfg(not(target_os = "android"))]
pub mod watchtower;
#[cfg(not(target_os = "android"))]
pub mod remediation;
#[cfg(not(target_os = "android"))]
pub mod quarantine;
#[cfg(not(target_os = "android"))]
pub mod network;
