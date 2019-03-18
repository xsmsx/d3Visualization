import { feature } from 'topojson';
import { csv, json } from 'd3';

export const loadAndProcessData = () => 
  Promise
    .all([
        csv('./viz.csv'),
        d3.tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
        json('https://unpkg.com/visionscarto-world-atlas@0.0.4/world/50m.json')
    ])
    .then(([myData, topoJSONdata]) => {
     
      const rowById = myData.reduce((accumulator, d) => {
        accumulator[d['Country Code']] = d;
        return accumulator;
      }, {});

      const countries = feature(topoJSONdata, topoJSONdata.objects.countries);

      countries.features.forEach(d => {
        Object.assign(d.properties, rowById[+d.id]);
      });
      
      const featuresWithhNEET = countries.features
        .filter(d => d.properties['2017'])
        // .map(d => {
        //   d.properties['2017'] = +d.properties['2017'].replace(/ /g, '');
        //   return d;
        // });

      return {
        features: countries.features,
        featuresWithNEET
      };
    });
