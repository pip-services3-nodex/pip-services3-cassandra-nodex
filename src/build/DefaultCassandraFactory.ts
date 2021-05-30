/** @module build */
import { Factory } from 'pip-services3-components-nodex';
import { Descriptor } from 'pip-services3-commons-nodex';

import { CassandraConnection } from '../connect/CassandraConnection';

/**
 * Creates Cassandra components by their descriptors.
 * 
 * @see [[https://pip-services3-nodex.github.io/pip-services3-components-nodex/classes/build.factory.html Factory]]
 * @see [[CassandraConnection]]
 */
export class DefaultCassandraFactory extends Factory {
    private static readonly CassandraConnectionDescriptor: Descriptor = new Descriptor("pip-services", "connection", "cassandra", "*", "1.0");

    /**
	 * Create a new instance of the factory.
	 */
    public constructor() {
        super();
        this.registerAsType(DefaultCassandraFactory.CassandraConnectionDescriptor, CassandraConnection);
    }
}
