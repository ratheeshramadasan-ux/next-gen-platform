export interface ConnectorStatus {
    status: 'CONNECTED' | 'DISCONNECTED' | 'POLLING' | 'ERROR';
    lastPoll: string;
    filesProcessed: number;
    failures: number;
    latency?: number;
    queueDepth?: number;
}

export interface BaseConnector {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    poll(): Promise<void>;
    validate(): Promise<boolean>;
    getStatus(): Promise<ConnectorStatus>;
}
