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
const assert = require('chai').assert;
const pip_services3_commons_nodex_1 = require("pip-services3-commons-nodex");
const CassandraConnectionResolver_1 = require("../../src/connect/CassandraConnectionResolver");
suite('CassandraConnectionResolver', () => {
    test('Connection Config', () => __awaiter(void 0, void 0, void 0, function* () {
        let dbConfig = pip_services3_commons_nodex_1.ConfigParams.fromTuples('connection.host', 'localhost', 'connection.port', 9042, 'connection.database', 'test', 'credential.username', 'cassandra', 'credential.password', 'cassandra');
        let resolver = new CassandraConnectionResolver_1.CassandraConnectionResolver();
        resolver.configure(dbConfig);
        let config = yield resolver.resolve(null);
        assert.isObject(config);
        assert.equal('localhost', config.getAsString("host"));
        assert.equal(9042, config.getAsInteger("port"));
        assert.equal('test', config.getAsString("datacenter"));
        assert.equal('cassandra', config.getAsString("username"));
        assert.equal('cassandra', config.getAsString("password"));
        assert.isNull(config.getAsNullableBoolean("ssl"));
    }));
    test('Connection Config from URI', () => __awaiter(void 0, void 0, void 0, function* () {
        let dbConfig = pip_services3_commons_nodex_1.ConfigParams.fromTuples('connection.uri', 'cassandra://cassandra:cassandra@localhost:9042/test');
        let resolver = new CassandraConnectionResolver_1.CassandraConnectionResolver();
        resolver.configure(dbConfig);
        let config = yield resolver.resolve(null);
        assert.isObject(config);
        assert.equal('localhost', config.getAsString("host"));
        assert.equal(9042, config.getAsInteger("port"));
        assert.equal('test', config.getAsString("datacenter"));
        assert.equal('cassandra', config.getAsString("username"));
        assert.equal('cassandra', config.getAsString("password"));
        assert.isNull(config.getAsNullableBoolean("ssl"));
    }));
});
//# sourceMappingURL=CassandraConnectionResolver.test.js.map