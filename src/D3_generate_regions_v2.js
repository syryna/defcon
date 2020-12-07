var jsdom = require('jsdom');
const {
    JSDOM
} = jsdom;

const d3 = require('d3');
const fs = require('fs');
const logger = require('./logger/logger');

const inv_nodes = require('./models/inv_nodes');
const inv_edges = require('./models/inv_edges');
const {
    ConsoleTransportOptions
} = require('winston/lib/winston/transports');

// load async node data from DB
async function findNodeData() {
    node_data = await inv_nodes.find({});
    return node_data;
}

// load async edge data from DB
async function findEdgeData() {
    edge_data = await inv_edges.find({});
    return edge_data;
}

// start when promise is available
findNodeData().then((nodes_data) => {
    if (nodes_data.length == 0) {
        logger.app.log('info', `inv_nodes - No record found !!!`);
        return
    } else {
        logger.app.log('info', `inv_nodes -  ${Object.keys(nodes_data).length} records from inv_nodes read`);
    }
});

// start when promise is available
findEdgeData().then((edges_data) => {
    if (edges_data.length == 0) {
        logger.app.log('info', `inv_edges - No record found !!!`);
        return
    } else {
        logger.app.log('info', `inv_edges -  ${Object.keys(edges_data).length} records from inv_edges read`);
    }
});

// wait that both inv_nodes and inv_edges is ready before processing
Promise.all([findNodeData(), findEdgeData()]).then(data => {

    // Variables
    nodes_data = data[0];
    edges_data = data[1];

    // sort data on regions, constellations and solar systems
    solar_systems_data = [];
    constellation_data = [];
    regions_data = [];
    for (i in nodes_data) {
        // if id is 10000000-19999999 then it is region
        if (nodes_data[i].id >= 10000000 && nodes_data[i].id < 20000000) {
            regions_data.push(nodes_data[i]);
        }
        // if id is 20000000-29999999 then it is constellation
        if (nodes_data[i].id >= 20000000 && nodes_data[i].id < 30000000) {
            constellation_data.push(nodes_data[i]);
        }
        // if id is >30000000 then it is solar systems
        if (nodes_data[i].id >= 30000000) {
            solar_systems_data.push(nodes_data[i]);
        }
    }
    logger.app.log('info', `${regions_data.length} regions found`);
    logger.app.log('info', `${constellation_data.length} constellations found`);
    logger.app.log('info', `${solar_systems_data.length} solar systems found`);

    // Create Universe SVG
    logger.app.log('info', `Start SVG Processing`);
    dom = new JSDOM(`<!DOCTYPE html><body></body>`);
    var chartWidth = 4000; // SVG width
    var chartHeight = 4000; // SVG hight
    var margin = 0; // Margin
    // Calculate scaling for x and y
    const all_x = solar_systems_data.map(function (item) {
        return item["x"]
    }); // all x's from all solar systems
    const all_y = solar_systems_data.map(function (item) {
        return item["y"]
    }); // all y,s from all solar systems
    // smallest nagative and biggest positive x,y
    var smallest_x = d3.min(all_x);
    var greatest_x = d3.max(all_x);
    var smallest_y = d3.min(all_y);
    var greatest_y = d3.max(all_y);
    // calculate scaling 
    var scale_x = d3.scaleLinear()
        .domain([smallest_x, greatest_x])
        .range([0 + margin, chartWidth - margin]);
    var scale_y = d3.scaleLinear()
        .domain([smallest_y, greatest_y])
        .range([0 + margin, chartWidth - margin]);
    // SVG creation
    var body = d3.select(dom.window.document.querySelector("body"));
    var svg = body.append('svg')
        .attr('width', chartWidth) // add width
        .attr('height', chartHeight) // add height
        .attr('xmlns', 'http://www.w3.org/2000/svg') // add xmlns
        .attr('viewBox', [0, 0, chartWidth, chartHeight]) // add viewbox
        .attr('data-width', chartWidth) // add data-width attribute for client processing
        .attr('data-height', chartHeight); // add data-height attribute for client processing
    logger.app.log('info', `Universe SVG created`);
    // background layer added
    var background_layer = svg.append("g")
        .attr("cursor", "move"); // special curser for client added
    logger.app.log('info', `Universe SVG <- g created`);
    background_layer.append("rect")
        .attr("width", chartWidth) // add width
        .attr("height", chartHeight) // add height
        .attr("fill", "#191d21") // add background color to same color as UI
    logger.app.log('info', `Universe SVG <- g <- rect created`);
    // add region data to background layer
    let regions = background_layer.selectAll(null)
        .data(regions_data) // add region data
        .enter()
        .append("g")
        .attr("data-node-type", "region_data") // add data attribute with node-type
        .attr("data-node-id", function (d) {
            return d.id
        }) // add data attribute with node-id
        .attr("data-node-sec", function (d) {
            return d.sec
        }) // add data attribute with node-sec
        .attr("data-node-name", function (d) {
            return d.label
        }) // add data attribute with node-name
        .attr("data-node-region", function (d) {
            return d.rid
        }); // add data attribute with node-region
    logger.app.log('info', `Universe SVG <- g <- region data added`);
    // add region text in backround layer
    regions.append('text') // append text element
        .text(function (d) {
            return d.label
        }) // enter name as label
        .attr("data-node-type", "region_label") // add data attribute with node-type
        .attr("x", function (d) {
            return scale_x(d.x)
        }) // position and scale x based on data
        .attr("y", function (d) {
            return scale_y(d.y)
        }) // position and scale y based on data
        .attr("data-node-id", function (d) {
            return d.id
        }) // add data attribute with node-id
        .attr("data-node-sec", function (d) {
            return d.sec
        }) // add data attribute with node-sec
        .attr("data-node-name", function (d) {
            return d.label
        }) // add data attribute with node-name
        .attr("data-node-region", function (d) {
            return d.rid
        }) // add data attribute with node-region
        .attr("text-anchor", "middle") // take x,y as the middle point for the text label
        .style("fill", "#ffffff") // color text
        .style("fill-opacity", 0.5) // set transparency
        .style("font-size", "60px") // set text size
    logger.app.log('info', `Universe SVG <- g <- text labels for regions added`);
    //calculate links between systems          
    let links = {}; // link array
    var counter = 1; // counter for output
    for (i of edges_data) { // loop over each edge
        source = i.source; // source system id
        target = i.target; // target system id    
        source_obj = solar_systems_data.find(function (el) {
            return el.id === source
        }); // get source details                                        
        target_obj = solar_systems_data.find(function (el) {
            return el.id === target
        }); // get target details
        startx = scale_x(source_obj.x); // scale x,?,?,?
        starty = scale_y(source_obj.y); // scale x,y,?,?
        endx = scale_x(target_obj.x); // scale x,y,x,?
        endy = scale_y(target_obj.y); // scale x,y,x,y
        links[source + "," + target] = { // enter array key ["30005xxx,30006xxx"]
            "startx": startx, // save x,?,?,?
            "starty": starty, // save ?,y,?,?
            "endx": endx, // save ?,?,x,?
            "endy": endy, // save ?,?,?,y
            "color": i.color, // save color
            "size": i.size // save size
        };
        counter++; // count up
    };
    logger.app.log('info', `Universe SVG ${counter} of links to be processed`);
    // add links between systems 
    var counter = 1;
    for (var i in links) {
        background_layer.append("line") // attach a line
            .attr("data-node-type", "solar_link") // add data attribute with node-type
            .attr("x1", links[i].startx) // x position of the first end of the line
            .attr("y1", links[i].starty) // y position of the first end of the line
            .attr("x2", links[i].endx) // x position of the second end of the line
            .attr("y2", links[i].endy) // y position of the second end of the line
            .style("stroke", links[i].color) // colour the line
            .style("stroke-width", links[i].size * 10); // set line thickness
        counter++;
    };
    logger.app.log('info', `Universe SVG <- g <- line added for system links: ${counter}`);
    // add solar system data to background layer
    let solar_systems = background_layer.selectAll(null)
        .data(solar_systems_data)
        .enter()
        .append("g")
        .attr("data-node-type", "solar_data") // add data attribute with node-type
        .attr("data-node-id", function (d) {
            return d.id
        }) // add data attribute with node-id
        .attr("data-node-sec", function (d) {
            return d.sec
        }) // add data attribute with node-sec
        .attr("data-node-name", function (d) {
            return d.label
        }) // add data attribute with node-name
        .attr("data-node-region", function (d) {
            return d.rid
        }); // add data attribute with node-region
    logger.app.log('info', `Universe SVG <- g <- solar system data added`);
    // // add solar system text in backround layer
    // solar_systems.append('text')                                        // append text element
    //     .text(function(d) { return d.label })                           // enter name as label
    //     .attr("data-node-type", "solar_system_label")                   // add data attribute with node-type
    //     .attr("data-node-id", function(d) { return d.id })              // add data attribute with node-id
    //     .attr("data-node-sec", function(d) { return d.sec })            // add data attribute with node-sec
    //     .attr("data-node-name", function(d) { return d.label })         // add data attribute with node-name
    //     .attr("data-node-region", function(d) { return d.rid })         // add data attribute with node-region
    //     .attr("x", function(d) { return scale_x(d.x) })                 // position and scale x based on data
    //     .attr("y", function(d) { return scale_y(d.y) })                 // position and scale y based on data
    //     .attr("text-anchor", "end")                                     // take x,y as the middle point for the text label
    //     .style("fill", "#ffffff")                                       // color text
    //     .style("fill-opacity", 0.7)                                     // set transparency
    //     .style("font-size", "12px")                                     // set text size
    // solar_systems.append('text')                                        // append text element
    //     .text(function(d) { return " (" + d.sec + ")" })                // enter name as label
    //     .attr("data-node-type", "solar_system_sec")                    // add data attribute with node-type
    //     .attr("data-node-id", function(d) { return d.id })              // add data attribute with node-id
    //     .attr("data-node-sec", function(d) { return d.sec })            // add data attribute with node-sec
    //     .attr("data-node-name", function(d) { return d.label })         // add data attribute with node-name
    //     .attr("data-node-region", function(d) { return d.rid })         // add data attribute with node-region
    //     .attr("x", function(d) { return scale_x(d.x) })                 // position and scale x based on data
    //     .attr("y", function(d) { return scale_y(d.y) })                 // position and scale y based on data
    //     .attr("text-anchor", "start")                                   // take x,y as the middle point for the text label
    //     .style("fill", "#ffffff")                                       // color text
    //     .style("fill-opacity", 0.7)                                     // set transparency
    //     .style("font-size", "12px")                                     // set text size
    // logger.app.log('info', `Universe SVG <- g <- text labels for regions added`);
    // add solar systems 
    solar_systems.append('circle') // attache a circle
        .attr("cx", function (d) {
            return scale_x(d.x)
        }) // add center x
        .attr("cy", function (d) {
            return scale_y(d.y)
        }) // add center y
        .attr("r", function (d) {
            return scale_y(d.size)
        }) // add radius
        .attr("data-node-type", "solar_system") // add data attribute with node-type
        .attr("data-node-id", function (d) {
            return d.id
        }) // add data attribute with node-id
        .attr("data-node-sec", function (d) {
            return d.sec
        }) // add data attribute with node-sec
        .attr("data-node-name", function (d) {
            return d.label
        }) // add data attribute with node-name
        .attr("data-node-region", function (d) {
            return d.rid
        }) // add data attribute with node-region
        .attr("cursor", "help")
        // Popover
        .attr("data-toggle", "popover")
        //.attr("title", function(d) { return d.label + " (" + d.sec +")"})
        .attr("data-content", function (d) {
            return d.id
        })
        //-----
        .style("fill-opacity", 1.0) // set transparency
        .style("stroke", "#ffffff") // set line color
        .style("stroke-width", 1) // set line thickness
        .style("fill", "#000000"); // set the fill colour 
    logger.app.log('info', `Universe SVG <- g <- circle for solar systems added`);
    // save SVG
    fs.writeFileSync('./src/public/media/regions.svg', body.html()); // save regions.svg
    logger.app.log('info', `Universe SVG saved`);
});