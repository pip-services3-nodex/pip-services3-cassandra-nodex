"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const process = require('process');
const assert = require('chai').assert;
const pip_services3_commons_nodex_1 = require("pip-services3-commons-nodex");
const pip_services3_commons_nodex_2 = require("pip-services3-commons-nodex");
const pip_services3_commons_nodex_3 = require("pip-services3-commons-nodex");
const CassandraConnection_1 = require("../../src/connect/CassandraConnection");
const DummyPersistenceFixture_1 = require("../fixtures/DummyPersistenceFixture");
const DummyCassandraPersistence_1 = require("./DummyCassandraPersistence");
suite('DummyCassandraConnection', () => {
    let connection;
    let persistence;
    let fixture;
    let cassandraUri = process.env['CASSANDRA_URI'];
    let cassandraHost = process.env['CASSANDRA_HOST'] || 'localhost';
    let cassandraPort = process.env['CASSANDRA_PORT'] || 9042;
    let cassandraDatacenter = process.env['CASSANDRA_DATACENTER'] || 'datacenter1';
    let cassandraKeyspace = process.env['CASSANDRA_KEYSPACE']; // || 'test';
    let cassandraUser = process.env['CASSANDRA_USER'] || 'cassandra';
    let cassandraPassword = process.env['CASSANDRA_PASSWORD'] || 'cassandra';
    if (cassandraUri == null && cassandraHost == null) {
        return;
    }
    setup(() => __awaiter(void 0, void 0, void 0, function* () {
        let dbConfig = pip_services3_commons_nodex_1.ConfigParams.fromTuples('connection.uri', cassandraUri, 'connection.host', cassandraHost, 'connection.port', cassandraPort, 'connection.datacenter', cassandraDatacenter, 'connection.keyspace', cassandraKeyspace, 'credential.username', cassandraUser, 'credential.password', cassandraPassword);
        connection = new CassandraConnection_1.CassandraConnection();
        connection.configure(dbConfig);
        persistence = new DummyCassandraPersistence_1.DummyCassandraPersistence();
        persistence.setReferences(pip_services3_commons_nodex_3.References.fromTuples(new pip_services3_commons_nodex_2.Descriptor("pip-services", "connection", "cassandra", "default", "1.0"), connection));
        fixture = new DummyPersistenceFixture_1.DummyPersistenceFixture(persistence);
        yield connection.open(null);
        yield persistence.open(null);
        yield persistence.clear(null);
    }));
    teardown(() => __awaiter(void 0, void 0, void 0, function* () {
        yield connection.close(null);
        yield persistence.close(null);
    }));
    test('Connection', () => {
        assert.isObject(connection.getConnection());
        assert.isString(connection.getDatacenter());
    });
    test('Crud Operations', () => __awaiter(void 0, void 0, void 0, function* () {
        yield fixture.testCrudOperations();
    }));
    test('Batch Operations', () => __awaiter(void 0, void 0, void 0, function* () {
        yield fixture.testBatchOperations();
    }));
});
//# sourceMappingURL=DummyCassandraConnection.test.js.map