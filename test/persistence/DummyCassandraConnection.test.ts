const process = require('process');
const assert = require('chai').assert;

import { ConfigParams } from 'pip-services3-commons-nodex';
import { Descriptor } from 'pip-services3-commons-nodex';
import { References } from 'pip-services3-commons-nodex';
import { CassandraConnection } from '../../src/connect/CassandraConnection';
import { DummyPersistenceFixture } from '../fixtures/DummyPersistenceFixture';
import { DummyCassandraPersistence } from './DummyCassandraPersistence';

suite('DummyCassandraConnection', ()=> {
    let connection: CassandraConnection;
    let persistence: DummyCassandraPersistence;
    let fixture: DummyPersistenceFixture;

    let cassandraUri = process.env['CASSANDRA_URI'];
    let cassandraHost = process.env['CASSANDRA_HOST'] || 'localhost';
    let cassandraPort = process.env['CASSANDRA_PORT'] || 9042;
    let cassandraDatacenter = process.env['CASSANDRA_DATACENTER'] || 'datacenter1';
    let cassandraKeyspace = process.env['CASSANDRA_KEYSPACE'];// || 'test';
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
            'connection.datacenter', cassandraDatacenter,
            'connection.keyspace', cassandraKeyspace,
            'credential.username', cassandraUser,
            'credential.password', cassandraPassword
        );

        connection = new CassandraConnection();
        connection.configure(dbConfig);

        persistence = new DummyCassandraPersistence();
        persistence.setReferences(References.fromTuples(
            new Descriptor("pip-services", "connection", "cassandra", "default", "1.0"), connection
        ));

        fixture = new DummyPersistenceFixture(persistence);

        await connection.open(null);
        await persistence.open(null);
        await persistence.clear(null);
    });

    teardown(async () => {
        await connection.close(null);
        await persistence.close(null);
    });

    test('Connection', () => {
        assert.isObject(connection.getConnection());
        assert.isString(connection.getDatacenter());
    });

    test('Crud Operations', async () => {
        await fixture.testCrudOperations();
    });

    test('Batch Operations', async () => {
        await fixture.testBatchOperations();
    });
});