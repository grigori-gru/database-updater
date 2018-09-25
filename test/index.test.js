const config = require('@bb/config');
const path = require('path');
const {stub} = require('sinon');
const TestSetter = require('../app/test-setter');
const {expect} = require('chai');
const log = require('@bb/logger')(module, config.log);

// const {database} = config;
// const testedData = require('./fixtures/test-data');

// const DIR_PATH = path.resolve(__dirname, '..', 'fixtures', 'scheme');

describe('Test test-setter', () => {
    let testSetter;
    const connectionName = 'testConnection';
    const script1 = 'CREATE SCHEMA IF NOT EXISTS main;';
    const script2 = 'CREATE SCHEMA IF NOT EXISTS main;';
    // const script2 = 'CREATE TABLE IF NOT EXISTS main.temp ();';
    // const script2 = 'SQL script2';

    const fakeDir = 'fakePath';
    const testDir = 'testPath';
    const test1 = 'test02.sql';
    const test2 = 'test10.sql';
    const testFileList = [test1, test2, 'test3', 'test4.js', '.ignore'];
    const testSchemaName = 'main';
    const fsStub = {
        readdir: stub(),
        readFile: stub(),
    };
    const getSchemaQuery = `SELECT schema_name
                            FROM information_schema.schemata
                            WHERE schema_name = :testSchemaName;`;
    // const dbStub = stub();

    before(async () => {
        testSetter = new TestSetter({fs: fsStub, config});
        log.debug(config);
        await db.init(config);
        log.debug(db.checkConnectionExist(connectionName));
        // log.debug(db);
        // log.debug(db[connectionName]);
    });

    after(async () => {
        await db.close();
    });

    beforeEach(() => {
        fsStub.readdir.withArgs(testDir).resolves(testFileList);
        fsStub.readFile.withArgs(path.resolve(testDir, test1), 'utf-8').resolves(script1);
        fsStub.readFile.withArgs(path.resolve(testDir, test2), 'utf-8').resolves(script2);
    });

    afterEach(() => {
        fsStub.readdir.reset();
        fsStub.readFile.reset();
    });

    it('Expect all files are found and sql script return', async () => {
        const scheme = await testSetter._getSchemeFiles(testDir);
        expect(scheme).to.be.a('string').and.eq(`${script1}\n${script2}`);
    });

    it('Expect no files are found and undefined return', async () => {
        fsStub.readdir.withArgs(fakeDir).resolves(['.ignore']);
        const scheme = await testSetter._getSchemeFiles(fakeDir);
        expect(scheme).not.to.be;
    });

    it('Expect no files are found and undefined return if path is not found', async () => {
        const errName = 'Error';
        fsStub.readdir.rejects(errName);
        try {
            const scheme = await testSetter._getSchemeFiles(fakeDir);
            expect(scheme).not.to.be;
        } catch (err) {
            expect(err.name).to.be.eq(errName);
        }
    });

    it('Expect test-setter create scheme according to given data', async () => {
        await testSetter.setScheme(testDir, connectionName);
        const preparedQuery = db[connectionName].getPreparedQuery('getScheme', getSchemaQuery, {testSchemaName});
        const {rows} = await db[connectionName].query(preparedQuery);

        expect(rows).to.be.an('array').that.is.not.empty;
    });

    it('Expect all files are found and sql script return', async () => {
        const scheme = await testSetter._getDataFiles(testDir);
        expect(scheme).to.be.a('string').and.eq(`${script1}\n${script2}`);
    });

    // it('Expect tested data to be added to test DB', async () => {
    //     await testSetter.insertTestData(testedData);
    //     // TODO add checking query
    //     const query = ``;
    //     const preparedQuery = db.pgPool.getPreparedQuery(query, {testedData});
    //     const {rows} = await db.pgPool.query(preparedQuery);
    //     expect(rows).to.be.an('array').that.is.not.empty;
    // });
});
