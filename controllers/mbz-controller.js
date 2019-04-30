const awaitTemp = require('../utilities/await-temp');
const fs = require('fs-extra'); // like node's 'fs', but with more methods and *promise support*.
const del = require('del');
const config = require('../utilities/config');
const extractMbz = require('../utilities/extract-mbz');
const parseMetaFromTags = require('../utilities/parse-meta-from-tags');
const parseCourse = require('../utilities/parse-course');
const tarQuestion = require('../utilities/tar-question');
const encodeQuestion = require('../utilities/encode-question');
const uploadDocuments = require('../utilities/upload-document');
const { sanitizeObject } = require('../utilities/sanitize-key');

async function parseAndSaveMbz(req, res) {
  // Create a temporary directory
  const dir = await awaitTemp.mkdir();
  // Put the mbz in that directory
  await fs.writeFile(dir + '/upload.mbz', req.body);
  // Extract the mbz
  await extractMbz(dir + '/upload.mbz', dir + '/extracted');
  // What questions are here?
  const questions = await fs.readdir(dir + '/extracted/activities');
  // Get an array of promises to question data
  const questionDataPromises = questions.map(question => encodeQuestion((`${dir}/extracted/activities/${question}`)));
  // Await all the promises to actually get the question data. This runs them all in parallel.
  const questionData = await Promise.all(questionDataPromises);
  // Upload the questionData to mongo
  await uploadDocuments(questionData.map(question => sanitizeObject(question)));
  
  //For each vpl in activites forlder, parse tags for validation
  questions.forEach(function (file, index) {
    var fromPath = dir + '/extracted/activities/' + file;
    //console.log(fromPath);
    parseMetaFromTags(fromPath);
  });

  // Remove the temporary directory
  await del(dir, { force: true });
  // Return the question data
  res.json(questionData);
}

module.exports = {
  parseAndSaveMbz
}