import { AutomationDocument, MongoDriverConfig } from 'common.types';
import { MongoClient, Db, Collection } from 'mongodb';

export class MongoDriver {
    private client: MongoClient;
    private db: Db | null = null;
    private config: MongoDriverConfig;
    private automationCollection: Collection<AutomationDocument> | undefined;

    constructor(config: MongoDriverConfig) {
        this.config = config;
        this.client = new MongoClient(this.buildMongoUri(config));
    }

    private buildMongoUri(config: MongoDriverConfig): string {
        const hasCredentials = Boolean(config.username) && Boolean(config.password);
        const credentials = hasCredentials
            ? `${encodeURIComponent(config.username!)}:${encodeURIComponent(config.password!)}@`
            : '';
        const authSource = hasCredentials ? `?authSource=${encodeURIComponent(config.authSource || 'admin')}` : '';

        return `mongodb://${credentials}${config.uri}/${config.dbName}${authSource}`;
    }

    async connect(): Promise<void> {
        if (!this.db) {
            await this.client.connect();
            this.db = this.client.db(this.config.dbName);
            this.automationCollection = this.db.collection<AutomationDocument>(this.config.collectionName);
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.db = null;
        }
    }

    async create(automation: Omit<AutomationDocument, '_id'>): Promise<string> {
        if (!this.automationCollection) throw new Error('Not connected to database');
        const result = await this.automationCollection.insertOne(automation as AutomationDocument);
        return result.insertedId.toString();
    }

    async getAutomation(id: string): Promise<AutomationDocument | null> {
        if (!this.automationCollection) throw new Error('Not connected to database');
        return this.automationCollection.findOne({ _id: id } as any);
    }

    async getAutomationByDeviceId(deviceId: string): Promise<AutomationDocument[]> {
        if (!this.automationCollection) throw new Error('Not connected to database');
        return this.automationCollection.find({ device_id: deviceId }).toArray();
    }

    async getAllAutomation(): Promise<AutomationDocument[]> {
        if (!this.automationCollection) throw new Error('Not connected to database');
        return this.automationCollection.find({}).toArray();
    }

    async updateAutomation(id: string, updates: Partial<AutomationDocument>): Promise<boolean> {
        if (!this.automationCollection) throw new Error('Not connected to database');
        const result = await this.automationCollection.updateOne({ _id: id } as any, {
            $set: updates,
        });
        return result.modifiedCount > 0;
    }

    async delete(id: string): Promise<boolean> {
        if (!this.automationCollection) throw new Error('Not connected to database');
        const result = await this.automationCollection.deleteOne({ _id: id } as any);
        return result.deletedCount > 0;
    }

    async clearCollections(): Promise<void> {
        if (!this.automationCollection) {
            throw new Error('Not connected to database');
        }
        await this.automationCollection.deleteMany({});
    }
}

export default MongoDriver;