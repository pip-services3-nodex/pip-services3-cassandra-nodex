const assert = require('chai').assert;
const process = require('process');

import { ConfigParams } from 'pip-services3-commons-nodex';
import { CassandraConnection } from '../../src/connect/CassandraConnection';

suite('CassandraConnection', () => {
    let connection: CassandraConnection;

    let cassandraUri = process.env['CASSANDRA_URI'];
    let cassandraHost = process.env['CASSANDRA_HOST'] || 'localhost';
    let cassandraPort = process.env['CASSANDRA_PORT'] || 9042;
    let cassandraKeyspace = process.env['CASSANDRA_KEYSPACE']; // || 'test';
    let cassandraDatacenter = process.env['CASSANDRA_DATACENTER'] || 'datacenter1';
    let cassandraUser = process.env['CASSANDRA_USER'] || 'cassandra';
    let cassandraPassword = process.env['CASSANDRA_PASSWORD'] || 'cassandra';

    if (cassandraUri == null && cassandraHost == null) {
        return;
    }

    setup(async () => {
        let dbConfig = ConfigParams.fromTuples(
            'connection.uri', cassandraUri,
            'connection.host', cassandraHost,
            'connection.port', cassandraPort,
            'connection.keyspace', cassandraKeyspace,
            'connection.datacenter', cassandraDatacenter,
            'credential.username', cassandraUser,
            'credential.password', cassandraPassword
        );

        connection = new CassandraConnection();
        connection.configure(dbConfig);

        await connection.open(null);
    });

    teardown(async () => {
        await connection.close(null);
    });

    test('Open and Close', () => {
        assert.isObject(connection.getConnection());
        assert.isString(connection.getDatacenter());
    });
});