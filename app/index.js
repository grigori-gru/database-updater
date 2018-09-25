const logger = require('debug');
const {promises} = require('fs');
const {extname, resolve, basename} = require('path');
const log = logger('database-updater');

const getNumber = fileName => {
    const num = basename(fileName, '.sql').replace(/\D+/, '');

    return Number(num);
};

const compareFileNames = (name1, name2) =>
    getNumber(name1) > getNumber(name2);

module.exports = class {
    /**
     * @param  {object} config config of current service
     * @param  {Object|undefined} fs file system
     * @param  {Object|undefined} db db manager
     */
    constructor({config, fs = promises, DB}) {
        this.db = new DB();
        this.config = config;
        this.fs = fs;
    }
    /**
     * @param  {string} pathToScheme path to dir where scheme files are
     */
    async _getSchemeFiles(pathToScheme) {
        const fileList = await this.fs.readdir(pathToScheme);
        log.debug(`fileList in ${pathToScheme} is ${fileList}`);
        const sqlFiles = fileList.filter(name => extname(name) === '.sql').sort(compareFileNames);
        log.debug(sqlFiles);

        const schemeArr = await Promise.all(sqlFiles.map(name =>
            this.fs.readFile(resolve(pathToScheme, name), 'utf-8')));

        // log.debug(schemeArr);

        const scheme = schemeArr.join('\n');

        return scheme.length > 0 && scheme;
    }

    /**
     * @param  {string} pathToScheme path to dir where scheme files are
     * @param  {Object} connectionName database connetion options
     */
    async setScheme(pathToScheme, connectionName) {
        try {
            const scheme = await this._getSchemeFiles(pathToScheme);
            log.debug(scheme);

            return scheme
                ? await this.db.query(scheme)
                : log.warn('No .sql files are found in directory ', pathToScheme);
        } catch (err) {
            // eslint-disable-next-line
            console.log(err);
            log.error(err);
            throw err;
            // log.error('Error setting scheme ', err);
        } finally {
            // await this.db.close();
        }
    }

    /**
     * @param  {string} pathToData path to dir where scheme files are
     * @returns {Map<string,object>} key fileName, value object with data
     */
    async _getFilesData(pathToData) {
        const fileList = await this.fs.readdir(pathToData);
        log.debug(`fileList in ${pathToData} is ${fileList}`);

        const filesJSONData = await Promise.all(fileList.map(name =>
            this.fs.readFile(resolve(pathToData, name), 'utf-8')));

        const filesData = filesJSONData.reduce((acc, val, index) => {
            const fileName = fileList[index];
            acc.set(fileName, JSON.parse(val));

            return acc;
        }, new Map());

        return filesData;
    }

    /**
     * @param  {string} pathToData path to dir where scheme files are
     */
    async insertTestData(pathToData) {
        try {
            const filesData = await this._getFilesData(pathToData);
            await Promise.all(filesData.map(([key, val]) => this.db.saveData(key, val)));
        } catch (err) {
            // eslint-disable-next-line
            console.log(err);
            log.error(err);
            throw err;
        }
    }
};
