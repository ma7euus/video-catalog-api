import {chalk} from "../require";
import {VideoCatalogApiApplication} from "../application";
import {config} from "../config";
import {Esv7DataSource} from "../datasources";
import {Client} from 'es7';

export class FixturesCommand {
    static command = 'fixtures';
    static description = 'Fixtures data in ElasticSearch';

    app: VideoCatalogApiApplication;

    async run() {
        console.log(chalk.green('Fixture data'));
        await this.bootApp();
        await this.deleteAllDocuments();
        console.log(chalk.green('Delete all documents'));
    }

    private async bootApp() {
        this.app = new VideoCatalogApiApplication(config);
        await this.app.boot();
    }

    private async deleteAllDocuments() {
        const dataSource: Esv7DataSource = this.app.getSync<Esv7DataSource>('datasources.esv7');
        // @ts-ignore
        const index = dataSource.adapter.settings.index;
        
        // @ts-ignore
        const client: Client = dataSource.adapter.db;
        await client.delete_by_query({
            index,
            body: {
                query: {match_all: {}}
            }
        });
    }
}