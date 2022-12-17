// Use for arguements
import process from 'node:process'

// Create libp2p
import { createLibp2p } from 'libp2p'

// Use ws for transports
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'

// Use Chainsafe's noise for crypto
import { noise } from '@chainsafe/libp2p-noise'

// Other libp2p utilities
import { mplex } from '@libp2p/mplex'
import { multiaddr } from 'multiaddr'

// Known peers addresses as bootstrap nodes
import { bootstrap } from '@libp2p/bootstrap'
const bootstrapMultiaddrs = [
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
    '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
]

// Configure DHTs
import { kadDHT } from '@libp2p/kad-dht'

// Use Chainsafe's gossipsub implementation
import { gossipsub } from '@chainsafe/libp2p-gossipsub'

const createNode = async () => {
    const node = await createLibp2p({
        addresses: {
            listen: ['/ip4/0.0.0.0/tcp/0/ws']
        },
        transports: [webSockets({
            filters: all
        })],
        connectionEncryption: [noise()],
        streamMuxers: [mplex()],
        peerDiscovery: [
            bootstrap({
                list: bootstrapMultiaddrs,
            })
        ],
        connectionManager: {
            autoDial: true,
        },
        dht: kadDHT(),
        pubsub: gossipsub({
            emitSelf: true
        })
    })
    return node
}

// start libp2p
const [node] = await Promise.all([
    createNode()
])
await node.start()
console.log('libp2p has started')

// print out listening addresses
console.log('listening on addresses:')
node.getMultiaddrs().forEach((addr) => {
    console.log(addr.toString())
})

// Peer discovery and connection messages from the services
node.addEventListener('peer:discovery', (evt) => {
    console.log('Discovered %s', evt.detail.id.toString())
})

// Log peer connections
node.connectionManager.addEventListener('peer:connect', (evt) => {
    console.log('Connected to %s', evt.detail.remotePeer.toString())
})

// Time gap from node setup to sending messages: 10s
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
await delay(10000)

// Start pubsub service
await node.pubsub.start()

// Subscribe to the "fruit" topic
node.pubsub.subscribe("fruit")

// Event listener for incoming messages
node.pubsub.addEventListener("message", (message) => {
    console.log(`${message.detail.topic}:`, new TextDecoder().decode(message.detail.data))
})

// Fire messages
node.pubsub.publish("fruit", new TextEncoder().encode("banana"))
node.pubsub.publish("fruit", new TextEncoder().encode("apple"))

// ping peer if received multiaddr
if (process.argv.length >= 3) {
    const ma = multiaddr(process.argv[2])
    console.log(`pinging remote peer at ${process.argv[2]}`)
    const latency = await node.ping(ma)
    console.log(`pinged ${process.argv[2]} in ${latency}ms`)
} else {
    console.log('no remote peer address given, skipping ping')
}

// stop libp2p
const stop = async () => {
    await node.stop()
    console.log('\nlibp2p has stopped')
    process.exit(0)
}

process.on('SIGTERM', stop)
process.on('SIGINT', stop)
