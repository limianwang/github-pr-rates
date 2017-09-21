'use strict';

const uuid = require('uuid');
const util = require('util');
const creds = require('./creds.json');
const repos = require('./repos.json');

const Table = require('easy-table');
const request = require('request');
const Promise = require('bluebird');

function getStatus(repo) {
  return new Promise((resolve, reject) => {
    let opts = {
      url: util.format(creds.url, creds.username, repo),
      json: true,
      headers: {
        'Authorization': `token ${creds.token}`
      }
    };
    request.get(opts, function(err, resp, body) {
      if (err) {
        return reject(err);

      }
      return resolve(body);
    });
  });
}

function filterOutdated(key, results) {
  return results.filter((item) => {
    let now = new Date().getTime();
    let createDate = new Date(item.created_at).getTime();
    return (now - createDate) / (24 * 3600 * 1000) > 1;
  }).map((item) => {
    let now = new Date().getTime();
    let createDate = new Date(item.created_at).getTime();
    return {
      component: key,
      user: item.user.login,
      title: item.title,
      url: item.html_url,
      days_diff: parseInt((now - createDate) / (24 * 3600 * 1000))
    };
  });
}

function main() {
  let promises = {};

  repos.forEach((repo) => {
    promises[repo] = getStatus(repo);
  });

  Promise.props(promises)
    .then((results) => {
      let data = [];

      Object.keys(results).forEach((key) => {
        data = data.concat(filterOutdated(key, results[key]));
      });
      return data;
    })
    .then((result) => {
      let t = new Table();

      result.forEach((row) => {
        t.cell('Component', row.component);
        t.cell('Title', row.title);
        t.cell('User', row.user);
        t.cell('Days since created', row.days_diff);
        t.cell('URL', row.url);
        t.sort(['Days since created|asc'])
        t.newRow();
      });

      console.log(t.toString());
      return t;
    })
    .catch((err) => {
      console.log(err);
    })
}

main();
