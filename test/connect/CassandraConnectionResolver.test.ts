const assert = require('chai').assert;

import { ConfigParams } from 'pip-services3-commons-nodex';
import { CassandraConnectionResolver } from '../../src/connect/CassandraConnectionResolver';

suite('CassandraConnectionResolver', ()=> {

    test('Connection Config', async () => {
        let dbConfig = ConfigParams.fromTuples(
            'connection.host', 'localhost',
            'connection.port', 9042,
            'connection.database', 'test',
            'credential.username', 'cassandra',
            'credential.password', 'cassandra',
        );

        let resolver = new CassandraConnectionResolver();
        resolver.configure(dbConfig);

        let config = await resolver.resolve(null);
        assert.isObject(config);
        assert.equal('localhost', config.getAsString("host"));
        assert.equal(9042, config.getAsInteger("port"));
        assert.equal('test', config.getAsString("datacenter"));
        assert.equal('cassandra', config.getAsString("username"));
        assert.equal('cassandra', config.getAsString("password"));
        assert.isNull(config.getAsNullableBoolean("ssl"));
    });

    test('Connection Config from URI', async () => {
        let dbConfig = ConfigParams.fromTuples(
            'connection.uri', 'cassandra://cassandra:cassandra@localhost:9042/test',
        );

        let resolver = new CassandraConnectionResolver();
        resolver.configure(dbConfig);

        let config = await resolver.resolve(null);
        assert.isObject(config);
        assert.equal('localhost', config.getAsString("host"));
        assert.equal(9042, config.getAsInteger("port"));
        assert.equal('test', config.getAsString("datacenter"));
        assert.equal('cassandra', config.getAsString("username"));
        assert.equal('cassandra', config.getAsString("password"));
        assert.isNull(config.getAsNullableBoolean("ssl"));
    });

});