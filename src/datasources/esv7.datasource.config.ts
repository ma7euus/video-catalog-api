import datasource from './esv7.datasource.config.json';

export default {
    ...datasource,
    "connector": "esv6",
    "index": "catalog",
    "version": 7,
    "debug": process.env.APP_ENV === 'dev',
    //"defaultSize": "",
    "configuration": {
        "node": process.env.ELASTIC_SEARCH_HOST,
        "requestTimeout": process.env.ELASTIC_SEARCH_REQUEST_TIMEOUT,
        "pingTimeout": process.env.ELASTIC_SEARCH_PING_TIMEOUT,
    },
    "mappingProperties": {
        "docType": {
            "type": "keyword"
        },
        "id": {
            "type": "keyword"
        },
        "name": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    "ignore_above": 256
                }
            }
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "is_active": {
            "type": "boolean"
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "created_at": {
            "type": "date"
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "updated_at": {
            "type": "date"
        }
    }
}
