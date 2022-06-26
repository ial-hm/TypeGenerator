import { ISerializer, SerializerData, SerializerDataArray } from "./ISerializer";
import { ArrayType, ClassType, LinkType, SimpleType } from "./types";
import { GetDate } from "./tools";
import { GetCppType, JsonLibrary } from "./SerializerTools";
import path from "path";

export class HppSerializer extends ISerializer {
    protected deps = new Set<string>();

    protected lib: JsonLibrary = JsonLibrary.RapidJson;

    constructor(fileName: string, author: string, namespace?: string) {
        super(fileName, author, "hpp", namespace);
    }

    protected begin() {
        this.store.header = `/**\n * @file ${this.fileName}.${this.extension}\n`;
        this.store.header += ` * @author ${this.author}\n * @brief Autogenerated by MckAudio TypeGenerator\n`;
        this.store.header += ` * @link https://github.com/MckAudio/TypeGenerator\n`;
        this.store.header += ` * @date ${GetDate()}\n */\n\n`;
        this.store.header += `#pragma once\n\n`;

        if (this.namespaceName !== undefined) {
            this.indent = "\t";
            this.store.content = `namespace ${this.namespaceName} {\n`;
            this.store.footer = `} // namespace ${this.namespaceName}\n`;
        }
    }

    end() {
        this.deps.forEach(dep => {
            this.store.header += `#include ${dep}\n`;
        });
        this.store.header += `\n`;
    }

    addClassMember(name: string, member: ClassType) {
        let tmp = new SerializerData();
        tmp.header = `${this.indent}class ${name} `;
        if (member.parent !== undefined) {
            tmp.header += `: public ${member.parent} `;
        }
        tmp.header += `{\n${this.indent}public:\n`;
        if (this.lib === JsonLibrary.RapidJson) {
            this.deps.add("<rapidjson/document.h>");
            this.deps.add("<rapidjson/prettywriter.h>");
            this.deps.add("<rapidjson/writer.h>");
            tmp.content += `${this.indent}\tbool to_json(rapidjson::PrettyWriter<rapidjson::StringBuffer> &writer) const;\n`;
            tmp.content += `${this.indent}\tbool to_json(rapidjson::Writer<rapidjson::StringBuffer> &writer) const;\n`;
            tmp.content += `${this.indent}\tbool from_json(const rapidjson::Value &obj);\n\n`;
        }
        tmp.footer = `${this.indent}}; // class ${name}\n\n`;

        this.classes[name] = new SerializerDataArray();
        this.classes[name].addMember(tmp);
    }

    addSimpleMember(className: string, name: string, member: SimpleType) {
        let tmp = `${this.indent}\t${GetCppType(member)} ${name}{`;
        if (member.default !== undefined) {
            if (member.type === "string") {
                tmp += `\"${member.default}\"`;
            } else {
                tmp += `${member.default}`;
            }
        }
        tmp += `};\n`;
        if (member.type === "string") {
            this.deps.add(`<string>`);
        }
        this.classes[className].addToContent(0, tmp);
    }

    addLinkMember(className: string, name: string, member: LinkType) {
        let tmp = `${this.indent}\t${GetCppType(member)} ${name}{};\n`;
        this.classes[className].addToContent(0, tmp);
        if (member.file !== undefined) {
            this.deps.add(`"${path.basename(member.file, path.extname(member.file))}.${this.extension}"`);
        }
    }

    addArrayMember(className: string, name: string, member: ArrayType) {
        let tmp = `${this.indent}\tstd::vector<${GetCppType(member.items)}> ${name}{};\n`;
        this.classes[className].addToContent(0, tmp);
        this.deps.add(`<vector>`);
    }

}