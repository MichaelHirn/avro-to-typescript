import { SpecialCharacterHelper } from "../../helpers/SpecialCharacterHelper";
import { TypeHelper } from "../../helpers/TypeHelper";
import { Field, RecordType, Type } from "../../interfaces/AvroSchema";
import { ExportModel } from "../../models/ExportModel";
import { BaseConverter } from "./base/BaseConverter";
import { EnumConverter } from "./EnumConverter";
import { PrimitiveConverter } from "./PrimitiveConverter";

export class RecordConverter extends BaseConverter {

    protected interfaceRows: string[] = [];

    public getTransformedName(data: RecordType): string {
        let fullName = data.name;
        if (data.namespace) { fullName = `${data.namespace}.${fullName}`; }
        if (typeof this.transformName === "function") { fullName = this.transformName(fullName); }
        return fullName;
    }

    public convert(data: any): ExportModel {
        data = this.getData(data) as RecordType;
        this.interfaceRows.push(...this.extractInterface(data));

        const exportModel = new ExportModel();
        exportModel.name = this.getTransformedName(data);
        exportModel.content = this.interfaceRows.join(SpecialCharacterHelper.NEW_LINE);
        this.exports.push(exportModel);

        return exportModel;
    }

    protected extractInterface(data: RecordType): string[] {
        const rows: string[] = [];
        const fullName = this.getTransformedName(data);

        rows.push(`export interface ${fullName} {`);
        for (const field of data.fields) {
            const fieldType = `${this.getField(field)};`;
            rows.push(`${SpecialCharacterHelper.TAB}${fieldType}`);
        }

        rows.push(`}`);

        return rows;
    }

    protected convertType(type: Type): string {
        if (typeof type === "string") {
            const primitiveConverter = new PrimitiveConverter({
                transformName: this.transformName,
            });
            return primitiveConverter.convert(type);
        }

        if (TypeHelper.isEnumType(type)) {
            const converter = new EnumConverter();
            const exportModel = converter.convert(type);

            if (this.enumExports.findIndex((enumExport) => enumExport.name === exportModel.name) < 0) {
                this.enumExports.push(exportModel);
            }

            return exportModel.name;
        }

        if (type instanceof Array) {
            return type.map((t) => this.convertType(t)).join(" | ");
        }

        if (TypeHelper.isRecordType(type)) {
            // do not push the interface if it is already in this.interfaceRows
            if (! this.interfaceRows.join("\n").includes(this.extractInterface(type).join("\n"))) {
                this.interfaceRows.push(...this.extractInterface(type));
                this.interfaceRows.push("");
            }

            // in case the type is another record,
            // apply the same transformName that we do on the record
            return typeof this.transformName === "function" ? this.transformName(type.name) : type.name;
        }

        if (TypeHelper.isArrayType(type)) {
            return `${this.convertType(type.items)}[]`;
        }

        if (TypeHelper.isMapType(type)) {
            // Dictionary of types, string as key
            return `{ [index: string]: ${this.convertType(type.values)} }`;
        }

        // this.addError(BaseConverter.errorMessages.TYPE_NOT_FOUND);
        // failure state, not sure what the type is
        return "any";
    }

    protected getField(field: Field): string {

        // process the type name
        const type = this.convertType(field.type);
        let transformedType = type;
        if (typeof this.transformName === "function") {
            transformedType = this.transformName(transformedType);
        }
        return `${field.name}${TypeHelper.isOptional(field.type) ? "?" : ""}: ${transformedType}`;
    }
}
