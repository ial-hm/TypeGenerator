import { ISerializer, SerializerData, SerializerDataArray } from "./ISerializer";
import { ArrayType, ClassType, DictType, EnumDefinition, EnumType, LinkType, SimpleType } from "./types";
import { GetDate } from "./tools";
import { GetCppNamespace, GetCppType, JsonLibrary } from "./SerializerTools";
import path from "path";

export class HppSerializer extends ISerializer {
    protected deps = new Set<string>();

    protected lib: JsonLibrary;

    constructor(fileName: string, author: string, namespace?: Array<string>, lib: JsonLibrary = JsonLibrary.RapidJson) {
        super(fileName, author, "hpp", namespace);
        this.lib = lib;
        this.deps.add("<cstdint>")
    }

    protected begin() {
        this.store.header = `/**\n * @file ${this.fileName}.${this.extension}\n`;
        this.store.header += ` * @author ${this.author}\n * @brief Autogenerated by MckAudio TypeGenerator\n`;
        this.store.header += ` * @link https://github.com/MckAudio/TypeGenerator\n`;
        //this.store.header += ` * @date ${GetDate()}\n */\n\n`;
        this.store.header += ` */\n\n`;
        this.store.header += `#pragma once\n\n`;
        this.store.content = "";

        let indent = "";
        for (let i = 0; i < this.namespaces.length; i++) {
            this.store.content += `${indent}namespace ${this.namespaces[i]} {\n`;
            indent += "\t";
        }
        this.indent = indent;
        for (let i = this.namespaces.length; i > 0; i--) {
            indent = Array.from({ length: i - 1 }, () => "\t").join("");
            this.store.footer += `${indent}} // namespace ${this.namespaces[i - 1]}\n`;
        }
    }

    end() {
        this.deps.forEach(dep => {
            this.store.header += `#include ${dep}\n`;
        });
        this.store.header += `\n`;
    }

    addEnumDefinition(name: string, member: EnumDefinition): void {
        let tmp = new SerializerData();
        tmp.header = `${this.indent}enum ${name} {\n`;
        Object.entries(member.items).forEach(e => {
            tmp.content += `${this.indent}\t${e[0]} = ${e[1]},\n`;
        });
        tmp.footer = `${this.indent}}; // enum ${name} \n\n`;
        this.enums[name] = tmp;
    }

    addClassMember(name: string, member: ClassType) {
        let tmp = new SerializerData();
        tmp.header = `${this.indent}class ${name} `;
        if (member.parent !== undefined) {
            tmp.header += `: public ${member.parent} `;
        }
        tmp.header += `{\n${this.indent}public:\n`;
        tmp.footer = `${this.indent}}; // class ${name}\n`;

        if (this.lib === JsonLibrary.RapidJson) {
            this.deps.add("<rapidjson/document.h>");
            this.deps.add("<rapidjson/prettywriter.h>");
            this.deps.add("<rapidjson/writer.h>");
            tmp.content += `${this.indent}\tbool to_json(rapidjson::PrettyWriter<rapidjson::StringBuffer> &writer) const;\n`;
            tmp.content += `${this.indent}\tbool to_json(rapidjson::Writer<rapidjson::StringBuffer> &writer) const;\n`;
            tmp.content += `${this.indent}\tbool from_json(const rapidjson::Value &obj);\n\n`;
        } else if (this.lib === JsonLibrary.Nlohmann) {
            this.deps.add("<nlohmann/json.hpp>");
            tmp.footer += `${this.indent}void to_json(nlohmann::json &j, const ${name} &c);\n`;
            tmp.footer += `${this.indent}void from_json(const nlohmann::json &j, ${name} &c);\n`;
        }

        tmp.footer += `\n`;

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
        let tmp = `${this.indent}\t${GetCppNamespace(member)}${GetCppType(member)} ${name}{};\n`;
        this.classes[className].addToContent(0, tmp);
        if (member.file !== undefined) {
            this.deps.add(`"${path.basename(member.file, path.extname(member.file))}.${this.extension}"`);
        }
    }

    addArrayMember(className: string, name: string, member: ArrayType) {
        let type = member.items.type === "array" ? `std::vector<${GetCppNamespace(member.items.items as LinkType)}${GetCppType(member.items.items)}>` : `${GetCppNamespace(member.items as LinkType)}${GetCppType(member.items)}`;
        let tmp = `${this.indent}\tstd::vector<${type}> ${name}{};\n`;
        this.classes[className].addToContent(0, tmp);
        this.deps.add(`<vector>`);
        let mi = member.items as LinkType;
        if (mi.file !== undefined) {
            this.deps.add(`"${path.basename(mi.file, path.extname(mi.file))}.${this.extension}"`);
        }
    }

    addEnumMember(className: string, name: string, member: EnumType): void {
        let tmp = `${this.indent}\t${GetCppType(member)} ${name}{`;
        if (member.default !== undefined) {
            tmp += `${GetCppType(member)}::${member.default}`;
        }
        tmp += `};\n`;
        this.classes[className].addToContent(0, tmp);
    }

    addDictMember(className: string, name: string, member: DictType): void {
        let type = `${GetCppNamespace(member.items as LinkType)}${GetCppType(member.items)}`;
        let tmp = `${this.indent}\tstd::map<std::string, ${type}> ${name}{};\n`;
        this.classes[className].addToContent(0, tmp);
        this.deps.add(`<map>`);
        this.deps.add(`<string>`);
        let mi = member.items as LinkType;
        if (mi.file !== undefined) {
            this.deps.add(`"${path.basename(mi.file, path.extname(mi.file))}.${this.extension}"`);
        }
    }
}