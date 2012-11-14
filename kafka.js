module.exports = function (
	inherits,
	EventEmitter,
	Topic,
	ZKConnector,
	StaticConnector,
	Compression) {

	// Kafka is the cornerstone of any nutritious queuing strategy.
	// With it you can connect to a Kafka cluster and create
	// Topics to your heart's content.
	//
	// options: {
	//   zookeeper: 'address:port'
	//   brokers:   [{name: host: port: },...]
	//   compression: 'none', 'gzip', 'snappy'
	//   maxMessageSize: -1
	//   queueTime: 5000
	//   batchSize: 200
	// }
	//
	function Kafka(options) {
		this.topics = {}
		this.options = options || {}
		this.connector = null
		this.topicDefaults = this.defaultOptions(options)
		EventEmitter.call(this)
	}
	inherits(Kafka, EventEmitter)

	function setCompression(string) {
		var compression
		switch (string && string.toLowerCase()) {
			case 'gzip':
				compression = Compression.GZIP
				break;
			case 'snappy':
				compression = Compression.SNAPPY
				break;
			default:
				compression = Compression.NONE
				break;
		}
		return compression
	}

	Kafka.prototype.defaultOptions = function (options) {
		var defaults = {}
		defaults.queueTime = options.queueTime || 5000
		defaults.batchSize = options.batchSize || 200
		defaults.minFetchDelay = options.minFetchDelay || 0
		defaults.maxFetchDelay = options.maxFetchDelay || 10000
		defaults.maxFetchSize = options.maxFetchSize || (300 * 1024)
		defaults.maxMessageSize = options.maxMessageSize || 1000000
		defaults.compression = setCompression(options.compression)
		defaults.partitions = null
		return defaults
	}

	// Connect to your friendly neighborhood Kafka cluster.
	// onconnect will be called when the first broker is available
	//
	// onconnect: function () {}
	Kafka.prototype.connect = function (onconnect) {
		if (this.options.zookeeper) {
			this.connector = new ZKConnector(this.options)
		}
		else if (this.options.brokers) {
			this.connector = new StaticConnector(this.options)
		}
		this.connector.once(
			'brokerAdded', // TODO: create a more definitive event in the connectors
			function () {
				this.emit('connect')
			}.bind(this)
		)
		this.connector.on(
			'brokerReady',
			function (b) {
				var topics = Object.keys(this.topics)
				for (var i = 0; i < topics.length; i++) {
					var name = topics[i]
					if (b.hasTopic(name)) {
						this.topics[name].setReady(true)
					}
				}
			}.bind(this)
		)
		if (typeof(onconnect) === 'function') {
			this.once('connect', onconnect)
		}
	}

	function setTopicOptions(topicOptions, defaults) {
		topicOptions = topicOptions || {}
		var keys = Object.keys(defaults)
		var options = {}
		for (var i = 0; i < keys.length; i++) {
			var name = keys[i]
			options[name] = topicOptions[name] || defaults[name]
		}
		return options
	}

	// Create or get a topic
	//
	// name: string
	// options: {
	//
	// }
	Kafka.prototype.topic = function (name, options) {
		options = setTopicOptions(options, this.topicDefaults)
		var topic = this.topics[name] ||
			new Topic(
				name,
				this.connector.producer,
				this.connector.consumer,
				options
			)
		this.topics[name] = topic
		return topic
	}

	return Kafka
}
