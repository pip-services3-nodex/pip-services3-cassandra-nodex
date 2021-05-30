"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DummyCassandraPersistence = void 0;
const pip_services3_commons_nodex_1 = require("pip-services3-commons-nodex");
const IdentifiableCassandraPersistence_1 = require("../../src/persistence/IdentifiableCassandraPersistence");
class DummyCassandraPersistence extends IdentifiableCassandraPersistence_1.IdentifiableCassandraPersistence {
    constructor() {
        super('test.dummies');
    }
    defineSchema() {
        this.clearSchema();
        this.ensureSchema('CREATE TABLE ' + this._tableName + ' (id TEXT PRIMARY KEY, key TEXT, content TEXT)');
        this.ensureIndex('key', { key: 1 }, { unique: true });
    }
    getPageByFilter(correlationId, filter, paging) {
        filter = filter || new pip_services3_commons_nodex_1.FilterParams();
        let key = filter.getAsNullableString('key');
        let filterCondition = null;
        if (key != null)
            filterCondition += "key='" + key + "'";
        return super.getPageByFilter(correlationId, filterCondition, paging, null, null);
    }
    getCountByFilter(correlationId, filter) {
        filter = filter || new pip_services3_commons_nodex_1.FilterParams();
        let key = filter.getAsNullableString('key');
        let filterCondition = null;
        if (key != null)
            filterCondition += "key='" + key + "'";
        return super.getCountByFilter(correlationId, filterCondition);
    }
}
exports.DummyCassandraPersistence = DummyCassandraPersistence;
//# sourceMappingURL=DummyCassandraPersistence.js.map