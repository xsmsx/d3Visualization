// import {
//     select,
//     json,
//     tsv,
//     geoPath,
//     geoNaturalEarth1,
//     zoom,
//     event
// } from 'd3';
// import { feature } from 'topojson';
//
// const svg = select('svg');
//
// const projection = geoNaturalEarth1();
// const pathGenerator = geoPath().projection(projection);
//
// const g = svg.append('g');
//
// g.append('path')
//     .attr('class', 'sphere')
//     .attr('d', pathGenerator({type: 'Sphere'}));
//
// svg.call(zoom().on('zoom', () => {
//     g.attr('transform', event.transform);
// }));
//
// Promise.all([
//     tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
//     json('https://unpkg.com/world-atlas@1.1.4/world/50m.json')
// ]).then(([tsvData, topoJSONdata]) => {
//
//     const countryName = tsvData.reduce((accumulator, d) => {
//         accumulator[d.iso_n3] = d.name;
//         return accumulator;
//     }, {});
//
//     /*
//     const countryName = {};
//     tsvData.forEach(d => {
//       countryName[d.iso_n3] = d.name;
//     });
//     */
//
//     const countries = feature(topoJSONdata, topoJSONdata.objects.countries);
//     g.selectAll('path').data(countries.features)
//         .enter().append('path')
//         .attr('class', 'country')
//         .attr('d', pathGenerator)
//         .append('title')
//         .text(d => countryName[d.id]);
//
// });





import {
    select,
    geoPath,
    geoCentroid,
    geoNaturalEarth1,
    zoom,
    event,
    scaleOrdinal,
    schemeSpectral,
    scaleSqrt,
    max,
    format
} from 'd3';

import { loadAndProcessData } from './loadAndProcessData';
// import { sizeLegend } from './sizeLegend';


// Promise.all([
//     tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
//     json('https://unpkg.com/world-atlas@1.1.4/world/50m.json')
// ]).then(([tsvData, topoJSONdata]) => {
//
//     const countryName = tsvData.reduce((accumulator, d) => {
//         accumulator[d.iso_n3] = d.name;
//         return accumulator;
//     }, {});
//
//     const countries = feature(topoJSONdata, topoJSONdata.objects.countries);
//     g.selectAll('path').data(countries.features)
//         .enter().append('path')
//         .attr('class', 'country')
//         .attr('d', pathGenerator)
//         .append('title')
//         .text(d => countryName[d.id]);
// });


const svg = select('svg');

const projection = geoNaturalEarth1();
const pathGenerator = geoPath().projection(projection);
const radiusValue = d => d.properties['2017'];

const g = svg.append('g');

const colorLegendG = svg.append('g')
    .attr('transform', `translate(40,310)`);

g.append('path')
    .attr('class', 'sphere')
    .attr('d', pathGenerator({type: 'Sphere'}));

svg.call(zoom().on('zoom', () => {
    g.attr('transform', event.transform);
}));

const populationFormat = format(',');

loadAndProcessData().then(countries => {

    const sizeScale = scaleSqrt()
        .domain([0, max(countries.features, radiusValue)])
        .range([0, 33]);

    g.selectAll('path').data(countries.features)
        .enter().append('path')
        .attr('class', 'country')
        .attr('d', pathGenerator)
        .attr('fill', d => d.properties['2017'] ? '#e8e8e8' : '#fecccc')
        .append('title')
        .text(d =>
            isNaN(radiusValue(d))
                ? 'Missing data'
                : [
                    d.properties['Country Code'],
                    populationFormat(radiusValue(d))
                ].join(': ')
        );

    countries.featuresWithNEET.forEach(d => {
        d.properties.projected = projection(geoCentroid(d));
    });

    g.selectAll('circle').data(countries.featuresWithNEET)
        .enter().append('circle')
        .attr('class', 'country-circle')
        .attr('cx', d => d.properties.projected[0])
        .attr('cy', d => d.properties.projected[1])
        .attr('r', d => sizeScale(radiusValue(d)));

    g.append('g')
        .attr('transform', `translate(45,215)`)
        // .call(sizeLegend, {
        //     sizeScale,
        //     spacing: 45,
        //     textOffset: 10,
        //     numTicks: 5,
        //     tickFormat: populationFormat
        // })
        .append('text')
        .attr('class', 'legend-title')
        .text('Population')
        .attr('y', -45)
        .attr('x', -30);

});