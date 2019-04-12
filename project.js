(function (topojson,d3) {
    'use strict';

    const loadAndProcessData = () =>
        Promise
            .all([
                d3.csv('./viz.csv'),
                d3.tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
                // d3.json('https://unpkg.com/visionscarto-world-atlas@0.0.4/world/50m.json')
                d3.json("https://unpkg.com/world-atlas@1/world/110m.json")



                ])
            .then(([myData, tsvData, topoJSONdata]) => {
                const rowById = myData.reduce((accumulator, d) => {
                    accumulator[d['Country Code']] = d;
                    return accumulator;
                }, {});

                const countries = topojson.feature(topoJSONdata, topoJSONdata.objects.countries);

                countries.features.forEach(d => {
                    Object.assign(d.properties, rowById[d.id]);
                });

                var featuresWithNEET = countries.features;

                return {
                    features: countries.features,
                    featuresWithNEET
                };
            });

        var inputValue = null;
        const time = ["pre 1990","1990","2000","2008","2009","2010","2011","2012","2013","2014","2015","2016","2017"];

        const svg = d3.select('svg');

        const projection = d3.geoNaturalEarth1();
        const pathGenerator = d3.geoPath().projection(projection);
        let radiusValue = d => d.properties[inputValue];

        const g = svg.append('g');

        g.append('path')
            .attr('class', 'sphere')
            .attr('d', pathGenerator({type: 'Sphere'}));

        svg.call(d3.zoom().on('zoom', () => {
            g.attr('transform', d3.event.transform);
        }));

        const populationFormat = d3.format(',');

    var sizeLegend = (selection, props) => {
        var {
            sizeScale,
            colorScale,
            spacing,
            textOffset,
            numTicks,
            tickFormat
        } = props;

        var ticks = sizeScale.ticks(numTicks)
            .filter(d => d !== 0)
            .reverse();

        var groups = selection.selectAll('g').data(ticks);

        var groupsEnter = groups
            .enter().append('g')
            .attr('class', 'tick');
        groupsEnter
            .merge(groups)
            .attr('transform', (d, i) =>
                `translate(0, ${i * spacing})`
            );
        groups.exit().remove();

        groupsEnter.append('circle')
            .merge(groups.select('circle'))
            .attr('r', sizeScale)
            .attr('fill', colorScale)
            .attr('stroke', 'none');

        groupsEnter.append('text')
            .merge(groups.select('text'))
            .text(tickFormat)
            .attr('dy', '0.32em')
            .attr('x', d => sizeScale(d) + textOffset);

    };

    loadAndProcessData().then(countries => {

        update("1990");
        // when the input range changes update the rectangle
        d3.select("#timeslide").on("input", function() {
            update(+this.value);
        });

        function update(value) {
            document.getElementById("range").innerHTML= time[value] === undefined? "Select Year" : time[value];
            inputValue = time[value];
            console.log(inputValue);
            radiusValue = d => d.properties[inputValue];
            updateMap();
        }

        function updateMap(){
            g.selectAll('circle').remove();
            g.selectAll('g').remove();
            g.selectAll('text').remove();


            countries.featuresWithNEET.forEach(d => {
                d.properties.projected = projection(d3.geoCentroid(d));
            });

            countries.featuresWithNEET = countries.features
                .filter(d => d.properties[inputValue])
                .map(d => {
                    d.properties[inputValue] = +d.properties[inputValue];
                    return d;
                });

            console.log(countries);

            var countryPath = g.selectAll('path').data(countries.features);

            countryPath
                .enter()
                .append('path')
                .attr('class', 'country')
                .attr('d', pathGenerator)
                .append('title');

            countryPath.select("title")
                // .attr('onMouseover', function)
                .text(function (d){
                    console.log(inputValue);
                    console.log(d.properties[inputValue]);
                        return [
                            d.properties['Country Name'],
                            radiusValue(d),
                        ].join(': ')
                    }
                );


                // .text(d =>
                //     isNaN(radiusValue(d))
                //         ? d.properties['Country Name']
                //         : [
                //             d.properties['Country Name'],
                //             radiusValue(d),
                //         ].join(': ')
                // );

            var sizeScale = d3.scaleSqrt().nice(5)
                .domain([0,50])
                .range([0, 8]);

            var colorScale = d3.scaleQuantize().nice(5)
                .domain([0, 50])
                .range(['#1a9850', '#66bd63', '#a6d96a', '#d9ef8b', '#fee08b', '#fdae61', '#f46d43', '#d73027']);

            g.selectAll('circle').data(countries.featuresWithNEET)
                .enter().append('circle')
                .attr('class', 'country-circle')
                .attr('cx', d => d.properties.projected[0])
                .attr('cy', d => d.properties.projected[1])
                .attr("r", 1)
                .transition().duration(200)
                .attr('r', d => sizeScale(radiusValue(d)))
                .style("fill", function (d) {
                    // console.log("radius value: ", radiusValue(d));
                    return colorScale(radiusValue(d));
                })
                .style("fill-opacity", "0.85")
                .style("stroke", "none");

            g.selectAll('circle').data(countries.featuresWithNEET)
                .exit()
                .transition().duration(200)
                .attr("r", 1)
                .remove();

            // d3.selectAll("circle").on("mouseover", function () {
            //     d3.select(this).lower();
            // });
            //
            // d3.selectAll("circle").on("mouseout", function () {
            //     d3.select(this).raise();
            // });

            g.append('g')
                .attr('transform', `translate(45,215)`)
                .call(sizeLegend, {
                    sizeScale,
                    colorScale,
                    spacing: 35,
                    textOffset: 5,
                    numTicks: 5,
                    tickFormat: populationFormat
                })
                .append('text')
                .attr('class', 'legend-title')
                .text('NEET % in Youth')
                .style('stroke', 'white')
                .attr('y', -35)
                .attr('x', -30)
                // .style("fill", function (d) {
                //     if (d != undefined) return colorScale(radiusValue(d));
                // })
                .exit()
                .remove();
             }
        });

}(topojson,d3));
