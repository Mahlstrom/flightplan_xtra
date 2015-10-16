/**
 * Created by mahlstrom on 15/10/15.
 */
var readPackageJSON = require('read-package-json'),
    revision = require('git-rev-2'),
    util = require('util');

var packageConfig;

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
    },
    /**
     *
     * @param local
     * @param files Array of files
     */
    exportFiles: function (local, files) {
        this.createFilename(local,'.tar.bz2');

        // The COPYFILE_DISABLE is to disable the inclusion of OS X crap files for extended attributes.
        local.exec(util.format('COPYFILE_DISABLE=1 tar -jcf %s %s ', this.fileName, files.join(" ")));
        local.log('Uploading archive to server');
        local.transfer(this.fileName, '~/');
        this.cleanLocal(local, this.fileName);
    },
    cleanLocal: function(local){
        local.exec(util.format('rm "%s"', this.fileName));
    },
    getGitFilesToObject: function (local, files) {
        files = files || [];
        files = files.join(" ");
        local.log(files);
        var gitfiles = local.exec(util.format('git ls-files %s', files), {silent: true});
        console.log();
        if (gitfiles.stdout == null) {
            local.abort('No git files found with in the specified path');
        }
        return gitfiles.stdout.split("\n");
    },
    extractRemote: function(remote){
        var pwd=remote.exec('pwd', {silent: true}).stdout.replace("\n","");
        this.remoteTmpDir = util.format('"%s/%s_deploy_tmp_%s"',pwd, packageConfig.name, (new Date().getTime()));
        var fileName=this.fileName;
        var remoteTmpDir=this.remoteTmpDir;
        remote.log(this.remoteTmpDir);
        remote.log('Creating temporary directory.');
        remote.exec(util.format('mkdir %s', this.remoteTmpDir));
        remote.log('Extracting new code.');
        remote.with(util.format('cd %s', this.remoteTmpDir), function () {
            remote.log('Extracting files.');
            remote.exec(util.format('tar -xmf %s/%s',pwd, fileName));
            pwd=remote.exec('pwd', {silent: true}).stdout.replace("\n","");
        });
        this.remoteTmpDir=pwd;
    },
    cleanUp: function(remote){
        remote.log('Cleaning up temporary files.');
        remote.exec(util.format('rm "%s"', this.fileName));
        remote.exec(util.format('rm -fr %s', this.remoteTmpDir));
    }
}
