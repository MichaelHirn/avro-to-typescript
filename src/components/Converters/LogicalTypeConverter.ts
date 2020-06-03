import { LogicalType } from "../../interfaces/AvroSchema";
import { BaseConverter } from "./base/BaseConverter";
import { PrimitiveConverter } from "./PrimitiveConverter";

export class LogicalTypeConverter extends BaseConverter {
    public convert(data: any): string {
        data = this.getData(data) as LogicalType;
        const primitiveConverter = new PrimitiveConverter();

        if (this.logicalTypes.map && data.logicalType in this.logicalTypes.map) {
            return this.logicalTypes.map[data.logicalType];
        }
        return primitiveConverter.convert(data.type);
    }
}
