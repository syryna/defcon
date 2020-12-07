var jsdom = require('jsdom');
const {
    JSDOM
} = jsdom;

const d3 = require('d3');
const fs = require('fs');
const logger = require('./logger/logger');

const inv_regions = require('./models/inv_regions');
const inv_solar_systems = require('./models/inv_solar_systems');
const {
    ConsoleTransportOptions
} = require('winston/lib/winston/transports');

// load async region data from DB
async function findRegionData() {
    regions_data = await inv_regions.find({});
    return regions_data;
}

// load async solar system data from DB
async function findSolarSystemData() {
    solar_systems_data = await inv_solar_systems.find({});
    return solar_systems_data;
}

// start when promise is available
findRegionData().then((regions_data) => {
    if (regions_data.length == 0) {
        logger.app.log('info', `inv_regions - No record found !!!`);
        return
    } else {
        logger.app.log('info', `inv_regions -  ${Object.keys(regions_data).length} records from inv_reagions read`);
    }
});

// start when promise is available
findSolarSystemData().then((solar_systems_data) => {
    if (solar_systems_data.length == 0) {
        logger.app.log('info', `inv_solar_systems - No record found !!!`);
        return
    } else {
        logger.app.log('info', `inv_solar_systems -  ${Object.keys(solar_systems_data).length} records from inv_solar_systems read`);
    }
});

// wait that both inv_regions and inv_solar_systems is ready before processing
Promise.all([findRegionData(), findSolarSystemData()]).then(data => {
    logger.app.log('info', `Start SVG Processing`);

    // Variables
    regions_data = data[0];
    solar_systems_data = data[1];

    // Create Universe SVG
    dom = new JSDOM(`<!DOCTYPE html><body></body>`);
    var chartWidth = 4000; // SVG width
    var chartHeight = 4000; // SVG hight
    var margin = 0; // Margin
    // Calculate scaling for x and y
    const all_x = solar_systems_data.map(function (item) {
        return item["center"].x
    }); // all x's from all solar systems
    const all_y = solar_systems_data.map(function (item) {
        return -item["center"].z
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
    var regions = background_layer.selectAll(null)
        .data(regions_data) // region data added
        .enter() // execute enter()
        .append("g"); // append a g for each data entry
    logger.app.log('info', `Universe SVG <- g <- region data added`);
    // add region text in backround layer
    regions.append('text') // append text element
        .text(function (d) {
            return d.name
        }) // enter name as label
        .attr("x", function (d) {
            return scale_x(d.center.x)
        }) // position and scale x based on data
        .attr("y", function (d) {
            return scale_y(-d.center.z)
        }) // position and scale y based on data
        .attr("text-anchor", "middle") // take x,y as the middle point for the text label
        .style("fill", "#ffffff") // color text
        .style("fill-opacity", 0.7) // set transparency
        .style("font-size", "24px") // set text size
    logger.app.log('info', `Universe SVG <- g <- text labels for regions added`);
    // calculate links between systems          
    let links = {}; // link array
    var counter = 1; // counter for output
    for (src_system of solar_systems_data) { // loop over solar system
        for (trg_system of src_system.neighbours) { // loop over each neighbour
            source = src_system.id; // source system id
            target = trg_system; // target system id
            if (target > source) { // for the sort and to avoid duplicates
                target_obj = solar_systems_data.find(function (el) {
                    return el.id === target
                }); // get neighbour details
                target = target; // target stays target
                source = source; // source stays source
                startx = scale_x(src_system.center.x); // scale x,?,?,?
                starty = scale_y(-src_system.center.z); // scale x,y,?,?
                endx = scale_x(target_obj.center.x); // scale x,y,x,?
                endy = scale_y(-target_obj.center.z); // scale x,y,x,y
            } else { // flip source and target (source should be always smaller number)
                target_obj = solar_systems_data.find(function (el) {
                    return el.id === target
                }); // get neighbour details
                target_temp = target; // save target to not overwrite it
                target = source; // flip target with source
                source = target_temp; // flip source with target
                startx = scale_x(target_obj.center.x); // scale x,?,?,?
                starty = scale_y(-target_obj.center.z); // scale x,y,?,?
                endx = scale_x(src_system.center.x); // scale x,y,x,?
                endy = scale_y(-src_system.center.z); // scale x,y,x,y
            }
            links[source + "," + target] = { // enter array key ["30005xxx,30006xxx"]
                "startx": startx, // save x,?,?,?
                "starty": starty, // save ?,y,?,?
                "endx": endx, // save ?,?,x,?
                "endy": endy // save ?,?,?,y
            };
            counter++; // count up
        };
    };
    logger.app.log('info', `Universe SVG ${counter} of links to be processed`);
    // add links between systems 
    var counter = 1;
    for (var key in links) {
        background_layer.append("line") // attach a line
            .style("stroke", "gray") // colour the line
            .attr("x1", links[key].startx) // x position of the first end of the line
            .attr("y1", links[key].starty) // y position of the first end of the line
            .attr("x2", links[key].endx) // x position of the second end of the line
            .attr("y2", links[key].endy); // y position of the second end of the line
        counter++;
    };
    logger.app.log('info', `Universe SVG <- g <- line added for system links: ${counter}`);
    // add solar system data to background layer
    let solar_systems = background_layer.selectAll(null)
        .data(solar_systems_data)
        .enter()
        .append("g");
    logger.app.log('info', `Universe SVG <- g <- solar system data added`);
    // add solar systems 
    solar_systems.append('circle') // attache a circle
        .attr("cx", function (d) {
            return scale_x(d.center.x)
        }) // add center x
        .attr("cy", function (d) {
            return scale_y(-d.center.z)
        }) // add center y
        .attr("r", 3) // add radius
        .attr("data-node-type", "solar_system") // add data attribute with node-type
        .attr("data-node-id", function (d) {
            return d.id
        }) // add data attribute with node-id
        .attr("data-node-sec", function (d) {
            return d.security
        }) // add data attribute with node-sec
        .attr("data-node-name", function (d) {
            return d.name
        }) // add data attribute with node-name
        .attr("data-node-constellation", function (d) {
            return d.constellation_id
        }) // add data attribute with node-constellation
        .attr("data-node-region", function (d) {
            return d.region_id
        }) // add data attribute with node-region
        .style("fill-opacity", 1.0) // set transparency
        .style("stroke", "#ffffff") // set line color
        .style("stroke-width", 1) // set line thickness
        .style("fill", "#000000"); // set the fill colour
    logger.app.log('info', `Universe SVG <- g <- circle for solar systems added`);
    // save SVG
    fs.writeFileSync('./src/public/media/regions.svg', body.html()); // save regions.svg
    logger.app.log('info', `Universe SVG saved`);
});