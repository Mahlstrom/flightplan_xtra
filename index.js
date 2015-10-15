/**
 * Created by mahlstrom on 15/10/15.
 */
var readPackageJSON = require('read-package-json'),
    revision = require('git-rev-2'),
    util = require('util');

module.exports = {
    remoteTmpDir: false,
    fileName: false,
    createFilename: function createFilename(local, extension) {
        // Get the package.json config.
        packageConfig = local.waitFor(function (callback) {
            readPackageJSON('./package.json', console.error, false, function (er, data) {
                if (er) {
                    local.abort('Could not read package.json.');
                    return;
                }

                if (!data.name) {
                    local.abort('You must have a name field in your package.json.');
                    return;
                }

                callback(data);
            });
        });

        this.remoteTmpDir = util.format('~/"%s_deploy_tmp_%s"', packageConfig.name, (new Date().getTime()));

                // Get what version this actually is that we are building.
        buildVersion = local.waitFor(function (ret) {
            revision.long('./', function (err, version) {
                if (err) {
                    local.abort('Could not get the project version number or commit hash from git.');
                    return;
                }
                ret(version);
            });
        });


        if (!(packageConfig.name && buildVersion && extension)) {
            local.abort('To build the tar file we need a name, version and an extension.');
        }
        this.fileName = packageConfig.name + '-' + buildVersion + extension;
    }
}
