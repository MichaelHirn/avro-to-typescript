import { SpecialCharacterHelper } from "../../helpers/SpecialCharacterHelper";
import { TypeHelper } from "../../helpers/TypeHelper";
import { RecordType } from "../../interfaces/AvroSchema";
import { ExportModel } from "../../models/ExportModel";
import { RecordConverter } from "./RecordConverter";

export class ClassConverter extends RecordConverter {

    protected interfaceRows: string[] = [];
    protected interfaceSuffix = "Interface";
    protected TAB = SpecialCharacterHelper.TAB;

    protected classRows: string[] = [];
    protected importRows: string[] = [];

    public convert(data: any): any {
        data = this.getData(data) as RecordType;

        this.classRows.push(...this.extractClass(data));
        this.importRows.push(...this.extractImports(data));

        this.getExportModels(data);

        return;
    }

    protected getExportModels(data: RecordType): ExportModel {
        const importExportModel: ExportModel = new ExportModel();
        const classExportModel: ExportModel = new ExportModel();
        const interfaceExportModel: ExportModel = new ExportModel();

        importExportModel.name = "imports";
        importExportModel.content = this.importRows.join(SpecialCharacterHelper.NEW_LINE);

        classExportModel.name = data.name;
        classExportModel.content = this.classRows.join(SpecialCharacterHelper.NEW_LINE);

        interfaceExportModel.name = data.name + this.interfaceSuffix;
        interfaceExportModel.content = this.interfaceRows.join(SpecialCharacterHelper.NEW_LINE);

        this.exports = [
            importExportModel,
            interfaceExportModel,
            classExportModel,
        ];

        return classExportModel;
    }

    protected extractImports(data: RecordType): string[] {
        const rows: string[] = [];
        const dirsUp: number = data.namespace.split(".").length;

        rows.push(`// tslint:disable`);
        rows.push(`import { BaseAvroRecord } from "` + "../".repeat(dirsUp) + `BaseAvroRecord";`);
        if (this.logicalTypes.importFrom) {
            rows.push(this.logicalTypes.importFrom);
        }

        for (const enumFile of this.enumExports) {
            const importLine = `import { ${enumFile.name} } from "./${enumFile.name}Enum";`;
            rows.push(importLine);
        }

        return rows;
    }

    protected extractClass(data: RecordType): string[] {
        const rows: string[] = [];
        const interfaceRows: string[] = [];
        const TAB = SpecialCharacterHelper.TAB;

        let shortName = data.name;
        const namespacedName = data.namespace ? `${data.namespace}.${shortName}` : shortName;
        let fullName = namespacedName;
        if (typeof this.transformName === "function") {
            shortName = this.transformName(shortName);
            fullName = this.transformName(fullName);
        }

        interfaceRows.push(`export interface ${fullName}${this.interfaceSuffix} {`);
        rows.push(`export class ${shortName} extends BaseAvroRecord implements ${fullName}${this.interfaceSuffix} {`);
        rows.push(``);

        rows.push(`${TAB}public static readonly subject: string = "${namespacedName}";`);
        rows.push(`${TAB}public static readonly schema: object = ${JSON.stringify(data, null, 4)}`);
        rows.push(``);

        rows.push(`${TAB}public static deserialize(buffer: Buffer, newSchema?: object): ${shortName} {`);
        rows.push(`${TAB}${TAB}const result = new ${shortName}();`);
        rows.push(
          `${TAB}${TAB}const rawResult = this.internalDeserialize(
            buffer,
            newSchema,
            ${this.logicalTypes.className ? `{ logicalTypes: ${this.logicalTypes.className} }` : "" }
        );`,
        );
        rows.push(`${TAB}${TAB}result.loadValuesFromType(rawResult);`);
        rows.push(``);
        rows.push(`${TAB}${TAB}return result;`);
        rows.push(`${TAB}}`);
        rows.push(``);

        for (const field of data.fields) {
            let fieldType;
            let classRow;
            let fullFieldName = field.name;
            if (typeof this.transformName === "function") { fullFieldName = this.transformName(fullFieldName); }
            if (TypeHelper.hasDefault(field) || TypeHelper.isOptional(field.type)) {
                const defaultValue = TypeHelper.hasDefault(field) ? ` = ${TypeHelper.getDefault(field)}` : "";
                fieldType = `${this.getField(field)}`;
                classRow = `${TAB}public ${fieldType}${defaultValue};`;
            } else {
                const convertedType = this.convertType(field.type);
                fieldType = `${fullFieldName}: ${convertedType}`;
                classRow = `${TAB}public ${fullFieldName}!: ${convertedType};`;
            }

            interfaceRows.push(`${this.TAB}${fieldType};`);

            rows.push(classRow);
        }
        interfaceRows.push("}");

        rows.push(``);

        rows.push(`${TAB}public schema(): object {`);
        rows.push(`${TAB}${TAB}return ${shortName}.schema;`);
        rows.push(`${TAB}}`);

        rows.push(``);

        rows.push(`${TAB}public subject(): string {`);
        rows.push(`${TAB}${TAB}return ${shortName}.subject;`);
        rows.push(`${TAB}}`);

        rows.push(`}`);

        this.interfaceRows.push(...interfaceRows);
        return rows;
    }
}
