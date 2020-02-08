const write = require('write');
const path = require('path');
const { introspectionQuery, graphql } = require('gatsby/graphql');

const defaultLocation = path.resolve(process.cwd(), 'schema.json');

function sortSchema(schemaPart) {
  if (typeof schemaPart === 'object') {
    if (schemaPart === null) return schemaPart;

    if (Array.isArray(schemaPart)) {
      const strings = [];
      const objects = [];

      schemaPart.forEach(part => {
        const type = typeof part;

        if (type === 'object') objects.push(sortSchema(part));
        else if (type === 'string') strings.push(part);
        else throw new Error(`Unknown type: ${type}`);
      });

      return strings
        .sort()
        .concat(objects.sort((a, b) => (a.name < b.name ? -1 : 1)));
    }

    const newObject = {};

    Object.keys(schemaPart)
      .sort()
      .forEach(key => (newObject[key] = sortSchema(schemaPart[key])));

    return newObject;
  }

  return schemaPart;
}

exports.onPostBootstrap = ({ store }, options) => {
  const dest = options.dest || defaultLocation;
  new Promise((resolve, reject) => {
    const { schema } = store.getState();
    graphql(schema, introspectionQuery)
      .then(res => {
        let schema = res.data.__schema;
        write.sync(
          dest,
          JSON.stringify({ __schema: sortSchema(schema) }, null, 2),
        );
      })
      .then(() => {
        console.log('[gatsby-plugin-extract-schema] Wrote schema');
        resolve();
      })
      .catch(e => {
        console.error(
          '[gatsby-plugin-extract-schema] Failed to write schema: ',
          e,
        );
        reject();
      });
  });
};
