const process = require('process');

import { ConfigParams } from 'pip-services3-commons-nodex';
import { DummyPersistenceFixture } from '../fixtures/DummyPersistenceFixture';
import { DummyCassandraPersistence } from './DummyCassandraPersistence';

suite('DummyCassandraPersistence', ()=> {
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

        persistence = new DummyCassandraPersistence();
        persistence.configure(dbConfig);

        fixture = new DummyPersistenceFixture(persistence);

        await persistence.open(null);
        await persistence.clear(null);
    });

    teardown(async () => {
        await persistence.close(null);
    });

    test('Crud Operations', async () => {
        await fixture.testCrudOperations();
    });

    test('Batch Operations', async () => {
        await fixture.testBatchOperations();
    });
});