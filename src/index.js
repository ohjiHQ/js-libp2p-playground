import process from 'node:process'
import { createLibp2p } from 'libp2p'

// import { tcp } from '@libp2p/tcp'
import { WebSockets } from '@libp2p/websockets'
import * as WebSocketsFilters from '@libp2p/websockets/filters'

import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { multiaddr } from 'multiaddr'

import { bootstrap } from '@libp2p/bootstrap'
// Known peers addresses
// const bootstrapMultiaddrs = [
//     '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
//     '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
// ]

import { kadDHT } from '@libp2p/kad-dht'

// import { floodsub } from '@libp2p/floodsub'
import { GossipSub } from '@chainsafe/libp2p-gossipsub'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'


// const createNode = async () => {
const node = await createLibp2p({
    addresses: {
        // add a listen address (localhost) to accept TCP connections on a random port
        listen: ['/ip4/0.0.0.0/tcp/0/ws']
    },
    // transports: [tcp()],
    transports: [
        new WebSockets({
            filter: WebSocketsFilters.all
        })
    ],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    // peerDiscovery: [
    //     bootstrap({
    //         list: bootstrapMultiaddrs,
    //     })
    // ],
    connectionManager: {
        autoDial: true,
    },
    // dht: kadDHT(),
    pubsub: new GossipSub({
        emitSelf: true
    }),
    nat: {
        enabled: false
    }
})
// return node
// }

// start libp2p
// const node = await createNode()
await node.start()
console.log('libp2p has started')

// // Peer discovery and connection messages from the services
// node.addEventListener('peer:discovery', (evt) => {
//     console.log('Discovered %s', evt.detail.id.toString()) // Log discovered peer
// })

// node.connectionManager.addEventListener('peer:connect', (evt) => {
//     console.log('Connected to %s', evt.detail.remotePeer.toString()) // Log connected peer
// })

// for await (const event of node.dht.findPeer(node.peerId)) {
//     // console.log(event)
// }

import PubSubRoom from 'ipfs-pubsub-room'
const room = new PubSubRoom(node, 'room-name')
room.on('peer joined', (peer) => {
    console.log('Peer joined the room', peer)
})

room.on('peer left', (peer) => {
    console.log('Peer left...', peer)
})

// now started to listen to room
room.on('subscribed', () => {
    console.log('Now connected!')
})

console.log("List of peers in the room: ", room.getPeers())

room.broadcast('Hello!')
console.log("Broadcasted message")
room.once('message', (message) => {
    console.log("Received a message: ", uint8ArrayToString(message.data))
})


// print out listening addresses
console.log('listening on addresses:')
node.getMultiaddrs().forEach((addr) => {
    console.log(addr.toString())
})

// ping peer if received multiaddr
if (process.argv.length >= 3) {
    const ma = multiaddr(process.argv[2])
    console.log(`pinging remote peer at ${process.argv[2]}`)
    const latency = await node.ping(ma)
    console.log(`pinged ${process.argv[2]} in ${latency}ms`)
} else {
    console.log('no remote peer address given, skipping ping')
}

// var counter = 0
// while (true) {
//     if (counter == 101) {
//         break
//     }
//     var message = "Hey" + counter
//     room.broadcast(message)
// }

const stop = async () => {
    // stop libp2p
    await node.stop()
    console.log('\nlibp2p has stopped')
    process.exit(0)
}

process.on('SIGTERM', stop)
process.on('SIGINT', stop)
