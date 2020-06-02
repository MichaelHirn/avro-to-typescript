import * as chai from "chai";
import * as fs from "fs-extra";
import * as path from "path";
import { Compiler } from "../../src";

const expect = chai.expect;

chai.should();

const dataFolder = path.resolve(`${__dirname}/../../../test/data/`);
const avroFolder = path.resolve(dataFolder + `/avro/`);
const expectedFolder = path.resolve(dataFolder + `/expected/`);
const compiledFolder = path.resolve(dataFolder + `/compiled/`);

const toCamelCase = (name: string) => {
    return name.replace(
        /(\w)\.(\w)/gu,
        (match, p1: string, p2: string) => `${p1}${p2.toUpperCase()}`,
    );
};

describe("Testing Compiler", () => {

    afterEach(() => {
        fs.removeSync(compiledFolder + "/com");
        fs.removeSync(compiledFolder + "/BaseAvroRecord.ts");
    });

    it(`should create User class when given User avro schema`, async () => {

        const avro = `${avroFolder}/User.avsc`;
        const compiledFile = `${compiledFolder}/com/example/avro/User.ts`;
        const expectedFile = `${expectedFolder}/User.ts.test`;

        const compiler = new Compiler(compiledFolder, {transformName: toCamelCase});

        await compiler.compile(avro);

        const actual = fs.readFileSync(compiledFile).toString();
        const expected = fs.readFileSync(expectedFile).toString();
        expect(actual).to.deep.equal(expected);
    });

    it(`should create TradeCollection class when given TradeCollection avro schema`, async () => {

        const avro = `${avroFolder}/TradeCollection.avsc`;
        const compiledFile = `${compiledFolder}/com/example/avro/TradeCollection.ts`;
        const expectedFile = `${expectedFolder}/TradeCollection.ts.test`;

        const compiler = new Compiler(compiledFolder, {transformName: toCamelCase});

        await compiler.compile(avro);

        const actual = fs.readFileSync(compiledFile).toString();
        const expected = fs.readFileSync(expectedFile).toString();
        expect(actual).to.deep.equal(expected);
    });

    it(`should create BaseAvroRecord file after compiling User schema`, async () => {

        const avro = `${avroFolder}/User.avsc`;
        const compiledFile = `${compiledFolder}/BaseAvroRecord.ts`;
        const expectedFile = `${expectedFolder}/BaseAvroRecord.ts.test`;

        const compiler = new Compiler(compiledFolder, {transformName: toCamelCase});

        await compiler.compile(avro);

        const actual = fs.readFileSync(compiledFile).toString();
        const expected = fs.readFileSync(expectedFile).toString();
        expect(actual).to.deep.equal(expected);
    });

});
