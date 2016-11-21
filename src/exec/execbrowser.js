/**
 * This is the main source
 * @file
 */

var exec = require('child_process').exec

function startBrowser (url) {
  var cmd =
  '"%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --incognito -url "' + url + '"'
  exec(cmd, function (error, stdout, stderr) {
    if (error) {
      console.error(`exec error: ${error}`)
      return
    }
    console.log(`stdout: ${stdout}`)
    console.log(`stderr: ${stderr}`)
  })
}

function expandParametersInURL (oMergedContextResult) {
  var ptn = oMergedContextResult.result.pattern
  Object.keys(oMergedContextResult.context).forEach(function (sKey) {
    var regex = new RegExp('{' + sKey + '}', 'g')
    ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
    ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
  })
  return ptn
}
/**
 * execute some starupt
 *
 */
function executeStartup (oMergedContextResult) {
  if (oMergedContextResult.result.type === 'URL') {
    var ptn = expandParametersInURL(oMergedContextResult)
    startBrowser(ptn)
    return ptn
  } else {
    var s = ("Don't know how to start " + oMergedContextResult.result.type + '\n for "' + oMergedContextResult.query + '"')
    console.log(s)
    return s
  }
}

module.exports = {
  executeStartup: executeStartup
}
