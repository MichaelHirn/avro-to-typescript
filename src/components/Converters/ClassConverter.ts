import { SpecialCharacterHelper } from "../../helpers/SpecialCharacterHelper";
import { TypeHelper } from "../../helpers/TypeHelper";
import { Field, RecordType } from "../../interfaces/AvroSchema";
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

    protected getFieldTypeAndClass(field: Field): {fieldType: string, classRow: string} {
        let fieldType;
        let classRow;
        let fullFieldName = field.name;
        if (typeof this.transformName === "function") { fullFieldName = this.transformName(fullFieldName); }
        if (TypeHelper.hasDefault(field) || TypeHelper.isOptional(field.type)) {
            const defaultValue = TypeHelper.hasDefault(field) ? ` = ${TypeHelper.getDefault(field)}` : "";
            fieldType = `${this.getField(field)}`;
            classRow = `public ${fieldType}${defaultValue};`;
        } else {
            const convertedType = this.convertType(field.type);
            fieldType = `${fullFieldName}: ${convertedType}`;
            classRow = `public ${fullFieldName}!: ${convertedType};`;
        }
        return { fieldType: `${fieldType};`, classRow };
    }

    protected getInterfaceText(data: RecordType, fullName: string) {
        return (
`export interface ${fullName}${this.interfaceSuffix} {
${data.fields.map((field) => {
    const { fieldType } = this.getFieldTypeAndClass(field);
    return "    " + fieldType;
}).join("\n")}
}
`);
    }

    protected getClassText(
        { data, fullName, shortName, namespacedName,
        }: {data: RecordType, fullName: string, shortName: string, namespacedName: string},
    ) {
        return (
`export class ${shortName} extends BaseAvroRecord implements ${fullName}${this.interfaceSuffix} {

    public static readonly subject: string = "${namespacedName}";
    public static readonly schema: object = ${
        JSON.stringify(data, null, 4)
            .split("\n")
            .map((line, i) => i === 0 ? line : "    " + line)
            .join("\n")
    };

    public static deserialize(buffer: Buffer, newSchema?: object): ${shortName} {
        const result = new ${shortName}();

        const rawResult = this.internalDeserialize(
            buffer,
            newSchema,
            ${this.logicalTypes.className ? `{ logicalTypes: ${this.logicalTypes.className} }` : "" }
        );
        result.loadValuesFromType(rawResult);

        return result;
    }

${data.fields.map((field) => {
    const { classRow } = this.getFieldTypeAndClass(field);
    return "    " + classRow;
}).join("\n")}

    public schema(): object {
        return ${shortName}.schema;
    }

    public subject(): string {
        return ${shortName}.subject;
    }
}`);
    }

    protected extractClass(data: RecordType): string[] {
        const rows: string[] = [];
        const interfaceRows: string[] = [];

        let shortName = data.name;
        const namespacedName = data.namespace ? `${data.namespace}.${shortName}` : shortName;
        let fullName = namespacedName;
        if (typeof this.transformName === "function") {
            shortName = this.transformName(shortName);
            fullName = this.transformName(fullName);
        }

        interfaceRows.push(this.getInterfaceText(data, fullName));

        rows.push(this.getClassText({data, fullName, shortName, namespacedName}));

        this.interfaceRows.push(...interfaceRows);
        return rows;
    }
}
