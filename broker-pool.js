module.exports = function (logger, inherits, EventEmitter) {
	function BrokerPool(name) {
		this.name = name
		this.brokers = []
		this.brokersById = {}
		this.current = 0
		EventEmitter.call(this)
	}
	inherits(BrokerPool, EventEmitter)

	BrokerPool.prototype.remove = function (broker) {
		var i = this.brokers.indexOf(broker)
		if (i >= 0) {
			this.brokers.splice(i, 1)
			delete this.brokersById[broker.id]
			logger.info(
				'brokerpool', this.name,
				'removed', broker.id
			)
			this.emit('brokerRemoved', broker)
		}
	}

	BrokerPool.prototype.add = function (broker) {
		if (this.brokers.indexOf(broker) < 0) {
			this.brokers.push(broker)
			this.brokersById[broker.id] = broker
			logger.info(
				'brokerpool', this.name,
				'added', broker.id
			)
			this.emit('brokerAdded', broker)
		}
	}

	BrokerPool.prototype.next = function () {
		this.current = (this.current + 1) % this.brokers.length
		return this.brokers[this.current]
	}

	BrokerPool.prototype.get = function (id) {
		return this.brokersById[id]
	}

	BrokerPool.prototype.contains = function (id) {
		return !!this.get(id)
	}

	BrokerPool.prototype.all = function () {
		return this.brokers
	}

	BrokerPool.nil = new BrokerPool('nil')

	return BrokerPool
}
