import * as vscode from "vscode";
import https from "https";

const SUMMARY_URL = "https://status.windsurf.com/api/v2/summary.json";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

let lastIndicator: string | null = null;
let lastError: boolean = false;
let initialized = false;
let lastIncidentIds = new Set<string>();
let lastMaintenanceIds = new Set<string>();

function fetchSummary(): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(SUMMARY_URL, { timeout: 10000 }, res => {
            let data = "";

            res.on("data", chunk => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error("Invalid JSON response"));
                }
            });
        });

        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
        });

        req.on("error", reject);
    });
}

function buildIdSet(items: Array<{ id?: string }>): Set<string> {
    return new Set(items.map(item => item.id).filter((id): id is string => Boolean(id)));
}

async function checkStatus() {
    try {
        const data = await fetchSummary();

        const indicator = data.status?.indicator;
        const description = data.status?.description;
        const incidents = Array.isArray(data.incidents) ? data.incidents : [];
        const maintenances = Array.isArray(data.scheduled_maintenances)
            ? data.scheduled_maintenances
            : [];

        if (lastError) {
            lastError = false;

            vscode.window.showInformationMessage(
                "Windsurf status service reachable again"
            );
        }

        if (indicator && indicator !== lastIndicator) {
            lastIndicator = indicator === "none" ? null : indicator;

            if (indicator !== "none") {
                vscode.window.showWarningMessage(
                    `Windsurf status: ${description}`
                );
            }
        }

        const currentIncidentIds = buildIdSet(incidents);
        const currentMaintenanceIds = buildIdSet(maintenances);

        if (!initialized) {
            lastIncidentIds = currentIncidentIds;
            lastMaintenanceIds = currentMaintenanceIds;
            initialized = true;
            return;
        }

        for (const incident of incidents) {
            if (incident?.id && !lastIncidentIds.has(incident.id)) {
                vscode.window.showWarningMessage(
                    `New incident: ${incident.name} (${incident.status})`
                );
            }
        }

        for (const maintenance of maintenances) {
            if (maintenance?.id && !lastMaintenanceIds.has(maintenance.id)) {
                vscode.window.showInformationMessage(
                    `New maintenance: ${maintenance.name} (${maintenance.status})`
                );
            }
        }

        lastIncidentIds = currentIncidentIds;
        lastMaintenanceIds = currentMaintenanceIds;

    } catch {
        if (!lastError) {
            lastError = true;

            vscode.window.showErrorMessage(
                "Unable to reach Windsurf status service"
            );
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    checkStatus();

    const timer = setInterval(checkStatus, CHECK_INTERVAL_MS);

    context.subscriptions.push({
        dispose: () => clearInterval(timer)
    });
}

export function deactivate() {}
