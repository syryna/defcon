// modules
require('dotenv').config();
const path = require('path');
var mongoose = require('mongoose');

var jsdom = require('jsdom');
const {
    JSDOM
} = jsdom;

const d3 = require('d3');
const fs = require('fs');
const logger = require('./logger/logger');

const inv_regions = require('./models/inv_regions');
const inv_solar_systems = require('./models/inv_solar_systems');
const inv_map_add = require('./models/inv_map_add');
const {
    ConsoleTransportOptions
} = require('winston/lib/winston/transports');

// make a connection
mongoose.connect('mongodb://localhost:27017/app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// get reference to database
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function () {
    console.log("Connection Successful!");

    // helper for removing duplicates from array
    function onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    }

    // load async region data from DB
    async function findRegionData() {
        regions_data = await inv_regions.find({});
        return regions_data;
    }
    // load async solar system data from DB
    async function findSolarSystemData() {
        all_solar_systems_data = await inv_solar_systems.find({});
        return all_solar_systems_data;
    }

    // load async edge data from DB
    async function findMapAddData() {
        map_add_data = await inv_map_add.find({});
        return map_add_data;
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
        if (all_solar_systems_data.length == 0) {
            logger.app.log('info', `inv_solar_systems - No record found !!!`);
            return
        } else {
            logger.app.log('info', `inv_solar_systems -  ${Object.keys(all_solar_systems_data).length} records from inv_solar_systems read`);
        }
    });

    // start when promise is available
    findMapAddData().then((maps_add_data) => {
        if (maps_add_data.length == 0) {
            logger.app.log('info', `inv_map_adds - No record found !!!`);
            return
        } else {
            logger.app.log('info', `inv_map_adds -  ${Object.keys(maps_add_data).length} records from inv_map_adds read`);
        }
    });

    regions_to_process = [
        10000001, 10000003, 10000004, 10000005, 10000006,
        10000007, 10000008, 10000009, 10000010, 10000002,
        10000011, 10000012, 10000013, 10000015, 10000014,
        10000016, 10000017, 10000018, 10000019, 10000020,
        10000021, 10000022, 10000023, 10000025, 10000027,
        10000028, 10000029, 10000030, 10000031, 10000032,
        10000033, 10000034, 10000035, 10000036, 10000037,
        10000038, 10000039, 10000040, 10000041, 10000042,
        10000043, 10000044, 10000045, 10000046, 10000047,
        10000048, 10000049, 10000050, 10000051, 10000052,
        10000053, 10000054, 10000055, 10000056, 10000057,
        10000058, 10000059, 10000060, 10000061, 10000062,
        10000063, 10000064, 10000065, 10000066, 10000067,
        10000068, 10000069
      ];  

    //regions_to_process = [10000060];

    // wait that both inv_regions and inv_solar_systems is ready before processing
    Promise.all([findRegionData(), findSolarSystemData(), findMapAddData()]).then(data => {

        // Variables
        var regions_data = data[0];
        var all_solar_systems_data = data[1];
        var map_add_data = data[2];

        // loop over regions and get system details
        for (reg_idx in regions_to_process) {

            region_id = regions_to_process[reg_idx];

            // reset region variables
            var all_systems_of_region = [];
            var all_neighbours_of_region = [];

            region_id = regions_to_process[reg_idx];

            // find all systems of a region
            all_systems_of_region = all_solar_systems_data.filter(system => system.region_id === region_id);

            // find all map_add of a region
            var all_neighbours_of_region = [];
            for (i in map_add_data) {
                if (map_add_data[i].rid === region_id) {
                    all_neighbours_of_region = map_add_data[i].add;
                }
            }
            for (i in all_neighbours_of_region) {
                add_system = all_solar_systems_data.filter(system => system.name === all_neighbours_of_region[i]);
                all_systems_of_region.push(add_system[0]);
            }
            logger.app.log('info', `${region_id}  - ${all_neighbours_of_region.length} neighbours added`);
            logger.app.log('info', `${region_id}  - ${all_systems_of_region.length} systems found`);

            solar_systems_data = all_systems_of_region;

            // Create Region SVG
            logger.app.log('info', `Start SVG Processing`);
            dom = new JSDOM(`<!DOCTYPE html><body></body>`);
            var chartWidth = 4000;                                                                                                  // SVG width
            var chartHeight = 4000;                                                                                                 // SVG hight
            var margin = 0;                                                                                                         // Margin

            // Calculate scaling for x and y
            const all_x = solar_systems_data.map(function (item) { return item.center.x });                                      // all x's from all solar systems
            const all_y = solar_systems_data.map(function (item) { return -item.center.z });                                     // all y,s from all solar systems
            
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
            // y = m*x+b // https://stackoverflow.com/questions/40535370/how-to-calculate-the-scales-result
            // m = (y2-y1)/(x2-x1)
            var m_for_x_axis = ((chartWidth - margin)-(0 + margin))/(greatest_x-smallest_x);
            var m_for_y_axis = ((chartWidth - margin)-(0 + margin))/(greatest_y-smallest_y);
            // b = y - m*x
            var b_for_x_axis = (0 + margin) - (m_for_x_axis * smallest_x);
            var b_for_y_axis = (0 + margin) - (m_for_y_axis * smallest_y);
            // x = (y-b)/m
            // var x = (2686.0478560044116-b)/m;
            // console.log("x: -407882737749210000 ", scale_x(-407882737749210000), " -> ", x);
    
            // SVG creation
            var body = d3.select(dom.window.document.querySelector("body"));
            var svg = body.append('svg')
                .attr('width', chartWidth)                                                                                          // add width
                .attr('height', chartHeight)                                                                                        // add height
                .attr('xmlns', 'http://www.w3.org/2000/svg')                                                                        // add xmlns
                .attr('viewBox', [0, 0, chartWidth, chartHeight])                                                                   // add viewbox
                .attr('data-width', chartWidth)                                                                                     // add data-width attribute for client processing
                .attr('data-height', chartHeight);                                                                                  // add data-height attribute for client processing
            logger.app.log('info', `${region_id} SVG created`);
            
            // background layer added
            var background_layer = svg.append("g")
                .attr("data-node-type", "background")
                .attr("data-node-rid", region_id)
                .attr("data-x-b", b_for_x_axis)
                .attr("data-x-m", m_for_x_axis)
                .attr("data-y-b", b_for_y_axis)
                .attr("data-y-m", m_for_y_axis)
                .attr("data-orig-scale-y", scale_y)
                .attr("cursor", "move");                                                                                            // special curser for client added
            logger.app.log('info', `${region_id} SVG <- g (background) created`);

            // system background added  
            //console.log(solar_systems_data);
            let voronoi = d3.Delaunay                                                                                               // Voronoi Test - https://observablehq.com/@d3/circle-dragging-iii?collection=@d3/d3-delaunay
                // Generate the delaunay triangulation of our data
                // takes data, x accessor and y accessor as arguments
                .from(solar_systems_data, d => scale_x(d.center.x), d => scale_y(-d.center.z))
                // Generate teh voronoi diagram from our delaunay triangulation
                // Takes the bounds of our diagram area as arguments [x0,y0,x1,y1]
                .voronoi([-50, -50, chartWidth+50, chartHeight+50]);        
            var system_background = background_layer.append("g")
                .attr("data-node-type", "solar_system_background");
            system_background.selectAll(null)
                .data(solar_systems_data.map((d,i) => voronoi.renderCell(i)))
                .join('path')
                .attr('data-node-id', function(d,i){ return solar_systems_data[i].id })
                .attr('data-node-rid', function(d,i){ return solar_systems_data[i].region_id })
                .attr('data-node-name', function(d,i){ return solar_systems_data[i].name })
                .attr('d', d => d)
                .style('fill', "#191d21")
                .style('opacity', 1.0)
                .style('stroke', '#ffffff')
                .style('stroke-opacity', 0.6)
                .style("stroke-width", 1);
            logger.app.log('info', `${region_id} SVG <- g (system background) <- path added`);

            // // add constellation data to background layer
            // var constellations = background_layer.append("g")
            //     .attr('data-node-type', 'constellations');
            // constellations.selectAll(null)
            //     .data(all_constellation_of_region)                                                                              // add constellation data
            //     .enter()
            //     .append('text')                                                                                                 // append text element
            //     .attr('data-node-name',function (d) { return d.label })                                                         // constellation
            //     .attr('data-node-id',function (d) { return d.id })                                                              // constellation id
            //     .attr('data-node-name',function (d) { return d.label })                                                         // constellation label
            //     .attr('data-node-rid',function (d) { return d.rid })                                                            // constellation region id
            //     .attr('data-node-sec',function (d) { return d.sec })                                                            // constellation security
            //     .text(function (d) { return d.label })                                                                          // enter name as label
            //     .attr("x", function (d) { return scale_x(d.x) })                                                                // position and scale x based on data
            //     .attr("y", function (d) { return scale_y(d.y) })                                                                // position and scale y based on data
            //     .attr("text-anchor", "middle")                                                                                  // take x,y as the middle point for the text label
            //     .style("fill", "grey")                                                                                          // color text
            //     .style("fill-opacity", 0.5)                                                                                     // set transparency
            //     .style("font-size", "48px");                                                                                    // set text size        
            // logger.app.log('info', `${region_id} SVG <- g (constellations) <- text labels for constellations added`);
            
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
                        if (!target_obj) {
                            continue;
                        }
                        target = target; // target stays target
                        source = source; // source stays source
                        startx = scale_x(src_system.center.x); // scale x,?,?,?
                        starty = scale_y(-src_system.center.z); // scale x,y,?,?
                        endx = scale_x(target_obj.center.x); // scale x,y,x,?
                        endy = scale_y(-target_obj.center.z); // scale x,y,x,y
                        // line type based on cross-constellation link or cross region link
                        var type = "";
                        var stroke = "";
                        if (src_system.constellation_id == target_obj.constellation_id) {
                            type = '';                                                                                              // Line-Type: *_*_*_*
                            stroke = "#ccc";
                        }
                        if (src_system.constellation_id != target_obj.constellation_id) { 
                            type = '20,20';                                                                                         // Line-Type: ****____****____                                                                       
                            stroke = "#ccc";
                        }      
                        if (src_system.region_id != target_obj.region_id) {
                            type = '5,5,20,5,5,20';                                                                                 // Line-Type: *_ ****_*____*_ ****_*____   
                            stroke = "#39F";
                        }  
                    }
                    if (target < source) { // flip source and target (source should be always smaller number)
                        target_obj = solar_systems_data.find(function (el) {
                            return el.id === target
                        }); // get neighbour details
                        if (!target_obj) {
                            continue;
                        }
                        target_temp = target; // save target to not overwrite it
                        target = source; // flip target with source
                        source = target_temp; // flip source with target
                        startx = scale_x(target_obj.center.x); // scale x,?,?,?
                        starty = scale_y(-target_obj.center.z); // scale x,y,?,?
                        endx = scale_x(src_system.center.x); // scale x,y,x,?
                        endy = scale_y(-src_system.center.z); // scale x,y,x,y
                        // line type based on cross-constellation link or cross region link
                        var type = "";
                        var stroke = "";
                        if (src_system.constellation_id == target_obj.constellation_id) {
                            type = '';                                                                                              // Line-Type: *_*_*_*
                            stroke = "#ccc";
                        }
                        if (src_system.constellation_id != target_obj.constellation_id) { 
                            type = '20,20';                                                                                         // Line-Type: ****____****____                                                                       
                            stroke = "#ccc";
                        }      
                        if (src_system.region_id != target_obj.region_id) {
                            type = '5,5,20,5,5,20';                                                                                 // Line-Type: *_ ****_*____*_ ****_*____   
                            stroke = "#39F";
                        }  
                    }                                                  

                    links[source + "," + target] = { // enter array key ["30005xxx,30006xxx"]
                        "startx": startx, // save x,?,?,?
                        "starty": starty, // save ?,y,?,?
                        "endx": endx, // save ?,?,x,?
                        "endy": endy, // save ?,?,?,y
                        "type": type, // dotted?
                        "stroke": stroke // color
                    };
                    counter++; // count up
                };
            };
            logger.app.log('info', `${region_id} SVG ${counter} of links to be processed`);
            
            // add links between systems 
            var system_links = background_layer.append("g")
                    .attr('data-node-type', 'links');
            var counter = 1;
            for (var i in links) {
                system_links
                    .append("line")                                                                                             // attach a line
                    .attr('data-node-type', 'link')                                                                             // node type
                    .style("stroke", links[i].stroke)                                                                           // colour the line
                    .style("stroke-dasharray", links[i].type)                                                                   // dotted line type
                    .style("stroke-width", 2.5)                                                                                 // set line thickness
                    .attr("x1", links[i].startx)                                                                                // x position of the first end of the line
                    .attr("y1", links[i].starty)                                                                                // y position of the first end of the line
                    .attr("x2", links[i].endx)                                                                                  // x position of the second end of the line
                    .attr("y2", links[i].endy);                                                                                 // y position of the second end of the line
                counter++;
            };
            logger.app.log('info', `${region_id} SVG <- g <- line added for system links: ${counter}`);

            // add solar system data to background layer
            var solar_systems = background_layer.append("g")
                .attr('data-node-type', 'solar_systems');
            solar_systems.selectAll(null)
                .data(solar_systems_data)                                                                                    // solar system data added
                .enter() 
                .append('g')
                .attr("data-node-id", function (d) { return d.id })                                                             // add data attribute with node id 
                .attr("data-node-name", function (d) { return d.name })
                .append('text')                                                                                                 // append text element
                .text(function (d) { return d.name })                                                                          // enter name as label
                .attr("data-node-id", function (d) { return d.id })                                                             // add data attribute with node id 
                .attr("data-node-name", function (d) { return d.name })
                .attr("x", function (d) { return scale_x(d.center.x) - 30 })                                                           // position and scale x based on data
                .attr("y", function (d) { return scale_y(-d.center.z) + 10 })                                                           // position and scale y based on data
                .attr("text-anchor", "end")                                                                                     // take x,y as the middle point for the text label
                .style("fill", "#ffffff")                                                                                       // color text
                .style("fill-opacity", 0.7)                                                                                     // set transparency
                .style("font-size", "24px")                                                                                     // set text size
            logger.app.log('info', `${region_id} SVG <- g <- text labels for systems added`);

            // add solar systems 
            for (i in solar_systems_data){
                var id = solar_systems_data[i].id;
                solar_systems.select('g[data-node-id="' + id + '"]')
                    .append('circle')                                                                                               // attache a circle
                    .attr("cx", function (d) { return scale_x(d.center.x) })                                                               // add center x
                    .attr("cy", function (d) { return scale_y(-d.center.z) })                                                               // add center y
                    .attr("r", "15")                                                                 // add radius
                    .attr("data-node-type", "solar_system")                                                                         // add data attribute with node-type
                    .attr("data-node-id", function (d) { return d.id })                                                             // add data attribute with node-id
                    .attr("data-node-sec", function (d) { return d.security })                                                           // add data attribute with node-sec
                    .attr("data-node-name", function (d) { return d.name })                                                        // add data attribute with node-name
                    .attr("data-node-region", function (d) { return d.region_id })                                                        // add data attribute with node-region
                    .attr("data-node-constellation", function (d) { return d.constellation_id })                                                        // add data attribute with node-region
                    .attr("cursor", "help")
                    .style("fill-opacity", 1.0)                                                                                     // set transparency
                    .style("stroke", "#ffffff")                                                                                     // set line color
                    .style("stroke-width", 2)                                                                                       // set line thickness
                    .style("fill", "#000000")                                                                                       // set the fill colour
            }                                                                
            logger.app.log('info', `${region_id} SVG <- g <- circle for solar systems added`);

            // save SVG
            fs.writeFileSync(`./src/public/media/${region_id}.svg`, body.html());                                               // save regions.svg
            logger.app.log('info', `${region_id} SVG saved`);
        }
    });
});