// modules
const fs = require('fs');
const logger = require('./logger/logger');
const path = require('path');

const inv_nodes = require('./models/inv_nodes');
const inv_edges = require('./models/inv_edges');
const {
    ConsoleTransportOptions
} = require('winston/lib/winston/transports');

// read the file
let rawdata = fs.readFileSync(path.join(__dirname, './eveeye_universe_map.json'));
let solarSystemsJSON = JSON.parse(rawdata);

//{"id":"10000001","label":"Derelik","rid":10000000,"x":541.9,"y":628.8,"size":5,"sec":0.506,"color":"#ffff00","c":""}
exclude_system = [];
for (index in solarSystemsJSON.nodes) {

    array_id = index;
    system = solarSystemsJSON.nodes[array_id];

    var solar_system = new inv_nodes({
        id: system.id,
        label: system.label,
        rid: system.rid,
        x: system.x,
        y: system.y,
        size: system.size,
        sec: system.sec,
        color: system.color,
        c: system.c
    });

    solar_system.save(function (err, solarSystemDoc) {
        if (err) return console.error(err);
        if (solarSystemDoc) {
            console.log(`"${solarSystemDoc.id}" - "${solarSystemDoc.label}" saved to inv_nodes collection.`);
        }
    });

    // save exclusion for edges of regions Cobald Edge, Oasa, Perrigan Falls, The Kalevala Expanse, Malpais, Outer Passage, Etherium Reach, The Spire
    if (system.rid == 10000013 ||
        system.rid == 10000018 ||
        system.rid == 10000021 ||
        system.rid == 10000027 ||
        system.rid == 10000034 ||
        system.rid == 10000040 ||
        system.rid == 10000053 ||
        system.rid == 10000066) {

        exclude_system.push(system);
    }
}

//{"id":"30002022-30002021","source":"30002022","target":"30002021","color":"#CCC","size":0.1}
edge:
    for (index in solarSystemsJSON.edges) {

        array_id = index;
        edge = solarSystemsJSON.edges[array_id];

        // stop if excluded system in any link
        exclude:
            for (i in exclude_system) {
                if (edge.source == exclude_system[i].id || edge.target == exclude_system[i].id) {
                    continue edge;
                }
            }

        var edge1 = new inv_edges({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            color: edge.color,
            size: edge.size
        });

        edge1.save(function (err, edgeDoc) {
            if (err) return console.error(err);
            if (edgeDoc) {
                console.log(`"${edgeDoc.id}" - saved to inv_nodes collection.`);
            }
        });
    }