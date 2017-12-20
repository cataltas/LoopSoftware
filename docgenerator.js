
'use strict';

const pathFramework = "../Yupana-Framework/server/lib";

const path = require("path");
const builder = require('xmlbuilder');
const fs = require('fs');

const ClassDef = require (path.resolve(pathFramework, 'ClassDef.js'));
const XML = require(path.resolve(pathFramework, 'ClassDoc.js'));
const uuid = require(path.resolve(pathFramework, 'uuid.js'));


// Récupération de la description :
// Récupérer la référence, découper la description sur les espaces et récupérer les valeurs d'exemple.
// Cas particulier : groupe.slot.
// Cas particulier : description récursive (référence).

// TODO: filtrer sur un module.

// TODO: you can use eslint to detect all improvable code, like unused variable or parameter, const variable, unreachable code, ...
class DocGenerator
{
    constructor()
    {
        this.ref = 1;
        this.cache = {};
        this.cache_2={};
        this.moduleList = {};
        this.slotProperties = [
            {propertyName: "defaultValue", propertyFunction: (currentSlot)=> {return this.booleanconverter(currentSlot)}, xmlText: (xml, currentSlot)=>{return xml.ele('li', 'Default Value: ' + currentSlot.defaultValue).up()}},
            {propertyName: "mandatory", xmlText: (xml, currentSlot)=> {return xml.ele('li', 'Mandatory').up()}},
            {propertyName: "computed", xmlText: (xml, currentSlot) => {return xml.ele('li')
                                                                                .ele('a',{'href':'Properties.html#computed'},'Computed').up().up()}},
            {propertyName: "disabled", xmlText:(xml, currentSlot)=> {return xml.ele('li')
                                                                            .ele('a',{'href':'Properties.html#disabled'},'Disabled').up().up()}},
            {propertyName: "hidden", xmlText: (xml, currentSlot)=>{return xml.ele('li')
                                                                            .ele('a',{'href': 'Properties.html#hidden'},'Hidden').up().up()}},
            {propertyName: "maxLength", xmlText: (xml, currentSlot)=>{return xml.ele('li', this.max_length_format(currentSlot.maxLength)).up()}},
            {propertyName: "recommended", xmlText: (xml, currentSlot)=>{return xml.ele('li')
                                                                                .ele('a',{'href':'Properties.html#recommended'},'Recommended').up().up()}},
            {propertyName: "included", xmlText: (xml, currentSlot)=>{return xml.ele('li')
                                                                        .       ele('a',{'href':'Properties.html#included'},'Included').up().up()}},                                                                            
            {propertyName: "unique", xmlText: (xml, currentSlot)=> {return xml.ele('li')
                                                                            .ele('a',{'href':'Properties.html#unique'},'Unique').up().up()}},
            {propertyName:"userName", xmlText: (xml, currentSlot)=>{return xml.ele('li')
                                                                            .ele('a',{'href':'Properties.html#userName'},'UserName: ').up()
                                                                            .txt(currentSlot.userName).up()}},
            {propertyName: "class", xmlText: (xml, currentSlot)=>{return xml.ele('li', 'Class: ')
                                                                            .ele('a',{'href': this.findLink(currentSlot)},currentSlot.class).up().up()}},
            {propertyName: "filter", xmlText: (xml, currentSlot)=>{return xml.ele('li')
                                                                            .ele('a',{'href':'Properties.html#filter'}, 'Filter: ').up()
                                                                            .txt(currentSlot.filter)}}       	
        ];
        this.groupProperties = [
            {propertyName: "hidden", xmlText: (xml, currentSlot)=>{return xml.ele('p')
                                                                            .ele('a',{'href': 'Properties.html#hidden'},'- Hidd').up()}},
            {propertyName: "inbound", xmlText: (xml, currentSlot)=>{return xml.ele('p')
                                                                            .ele('a',{'href':'Properties.html#inbound'},'- Inbound').up()}},
            {propertyName: "userName", xmlText: (xml, currentSlot)=>{return xml.ele('p')
                                                                            .ele('a',{'href':'Properties.html#userName'},'- UserName: ').up()
                                                                            .txt(currentSlot.userName);}},                                                                                                                                                                                                   
        ];
        this.classProperties = [
            {propertyName: "filters", xmlText: (xml, currentClass)=>{return xml.ele('p')
                                                                            .ele('a',{'href':'Properties.html#filters'},'- Filters: ').up()
                                                                            .txt(currentClass.filters)}},
            {properyName: "longDescription", xmlText: (xml, currentClass)=> {return xml.ele('p')
                                                                                    .ele('a',{'href':'Properties.html#longDescription'},'- LongDescription: ').up()
                                                                                    .txt(currentClass.longDescription)}},
            {propertyName: "shortDescription", xmlText: (xml, currentClass)=> {return xml.ele('p')
                                                                                            .ele('a',{'href':'Properties.html#shortDescription'},'- ShortDescription: ').up()
                                                                                            .txt(currentClass.shortDescription)}},
            {propertyName:"scope", xmlText: (xml, currentClass)=> {return xml.ele('p')
                                                                            .ele('a',{'href': 'Properties.html#scope'},'- Scope: ').up()
                                                                            .txt(currentClass.scope)}}                                                                                                                                                                                                                                                                
        ]; 
        
        this.arrayProperties = [
            {propertyName: "sortBy", xmlText: (xml, currentSlot)=>{return xml.ele('p')
                                                                            .ele('a',{'href':'Properties.html#sortBy'},'- SortBy: ').up()
                                                                                        .txt(currentSlot.sortBy)}},
            {propertyName: "inbound", xmlText: (xml, currentSlot)=>{return  xml.ele('p')
                                                                            .ele('a',{'href':'Properties.html#inbound'},'- Inbound').up().up()}},
        ];
    }
    loadXMLfunc (moduleList, classname) {
        return new Promise((resolve, reject) => {
            let module_name = classname.split('.')[0];
            let class_name = classname.split('.')[1];

            let filename = path.join(moduleList[module_name], "/classes/", class_name + ".xml");
            fs.readFile(filename, (err, data) => {
                if (err)
                {
                    console.log(err);
                    reject(err);
                }
                else
                {
                    resolve(data);
                }
            });
        });
    };

    slotsFinder(filename) {
        let me = this;
        function loadXML(className) {
            let key = className;
            if (me.cache_2[key]){
                return Promise.resolve(me.cache_2[key]);
            } else {
                return me.loadXMLfunc(me.moduleList, className).then(result=>{
                    me.cache_2[key]=result;
                    return result;
                });
            }
        }
        return new Promise((resolve, reject) => {
            let key = filename.replace(/\./g, '_');
            if (this.cache[key]){
                resolve(this.cache[key]);
            } else {
                return ClassDef.loadClassFromXML(filename, loadXML).then(result=>{
                    return XML.loadDocFromXML(filename, loadXML).then(result_doc=>{
                        let doc_obj={class: result, doc:result_doc};
                        this.cache[key] = doc_obj;
                        resolve(doc_obj);
                    }, (e) => {
                        resolve({class:result, doc:[]});
                    });
                });
            }
        });
    }  

    objectCreator(slots, slots_doc, obj){
        let steps = [];
        for (let key in slots) {
            steps.push(new Promise((resolve,reject)=>{
                let currentSlot = slots[key];
                let nowSlot=slots_doc;
                if (slots_doc[key])
                    nowSlot = slots_doc[key];
                if (currentSlot.type) {
                    if (nowSlot) {
                        if (nowSlot.example){
                            obj[key] = nowSlot.example;
                            resolve();
                        
                        } else {
                            switch (currentSlot.type){
                                case 'YTarray':
                                    return this.slotsFinder(currentSlot.class).then(result=>{
                                        obj[key]=[];
                                        obj[key][0]={longDescription: result.class.longDescription, objectId: uuid.v4(), revisionId: this.randomGenerator(), shortDescription: result.class.shortDescription};
                                        return this.objectCreator(result.class.slots,result.doc.slots? result.doc.slots: [], obj[key][0]).then(resolve,reject);
                                    });
                                    break;
                                case 'YTref': 
                                    return this.slotsFinder(currentSlot.class).then(result=>{
                                        obj[key] = {longDescription: result.class.longDescription, objectId: uuid.v4(), revisionId: this.randomGenerator(), shortDescription: result.class.shortDescription};
                                        resolve();
                                    });
                                    break;
                                case 'YTmoney':
                                    obj[key] = {amount:"",currency:"",currencyAmount:"",currencyRate:""};
                                    break;
                                case 'YTuuid':
                                    obj[key] = uuid.v4();
                                    break;
                                case 'YTfile':
                                    obj[key]={data:"", mimeType:"",name:"",objectId:uuid.v4(),uri:""};
                                    break;
                                default: 
                                    obj[key] = null;
                                    //console.log("An example value has not been provided for the slot "+currentSlot.parentModule+"."+currentSlot.parentClass+"."+currentSlot.name);
                            }
                            resolve();
                        } 
                    } else {
                        resolve();
                    }
                } else if (typeof(currentSlot) == 'object') {
                    obj[key] = {};
                    return this.objectCreator(currentSlot,nowSlot,obj[key]).then(resolve,reject);
                }else {
                   resolve();
                } 
            }));
    } 
    return Promise.all(steps);
    }

    browseValues(slots, slots_doc, xml){
        let new_xml = xml.ele('div', {'class':'container'})
            .ele('a', {'class':'btn btn-info','href':'#'+this.ref,'data-toggle':'collapse'}, 'Options').up()
            .ele('div', {'id':this.ref, 'class':'collapse'})
            .ele('ul'); 

        let enumVal = slots.enumValues.split(',');
        if (slots_doc.enum){
            if(enumVal.length !== slots_doc.enum.length){
                //console.log("Not all enumeration values of the slot "+slots.parentModule+"."+slots.parentClass+"."+slots.name+" have been documented.");
                for (let i=0; i<enumVal.length; i++)
                    new_xml.ele('li',enumVal[i].replace(/{|}/g,"")).up();        
            } else {
                for (let i=0; i<enumVal.length; i++){
                    new_xml.ele('li')
                            .ele('strong',slots_doc.enum[i].value+') '+enumVal[i].replace(/{|}/g,"").split(':')[0]+ ': ').up()
                            .txt(slots_doc.enum[i].description).up();
                }
            }
        } else {
            //console.log('No documentation has been made for the values of '+slots.parentModule+"."+slots.parentClass+"."+slots.name);
            for (let i=0; i<enumVal.length; i++)
                new_xml.ele('li',enumVal[i].replace(/{|}/g,"")).up(); 
        }
    }

    booleanconverter(processing_slot){
        if (processing_slot.type == 'YTboolean' && processing_slot.defaultValue == 0) {
            processing_slot.defaultValue = 'false';
        } else if (processing_slot.type == 'YTboolean' && processing_slot.defaultValue == 1){
            processing_slot.defaultValue  = 'true';
        }
    }

    XMLtoString(filename){

        return new Promise((resolve, reject) => {

            fs.readFile(filename, (err, data) => {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(data.toString());
                }
            });
        });
    }

    randomGenerator(){
    let alphabet = "0123456789ABCDEF";
    let N = alphabet.length;
    let number = "0x0000000000";
    for (let i = 0;i<6;i++)
        number += alphabet.charAt(Math.floor(Math.random()*N));
    return number;
    }

    findLink(slot){
        let module_name = slot.class.split('.')[0];
        let class_name = slot.class;
        let directory = 'Classes_Doc/'+module_name+"/"+class_name+'.html';
        return directory;
    }

    max_length_format(maxLength){
        if (maxLength=='-1')
            return ('This string does not have a limit of characters.');
        else 
            return ('This string has a limit of ' + maxLength+ ' characters.');
    }

    browseSlots(slots, slots_doc, xml) { 
        let steps = [];
        for (let key in slots) {
            steps.push(new Promise((resolve,reject)=>{
                let currentSlot = slots[key];
                let nowSlot = slots_doc;
                if (slots_doc[key]){
                    nowSlot=slots_doc[key];
                } else if(currentSlot.type){
                    //console.log("The slot "+currentSlot.parentModule+"."+currentSlot.parentClass+"."+currentSlot.name+" has not been included in the documentation.");
                }
                if (currentSlot.type) {
                
                    if(currentSlot.type == 'YTarray'){

                        xml.ele('h4','Array: '+ currentSlot.name).up()
                            .ele('p', '- Class')
                            .ele('a',{'href': this.findLink(currentSlot)},currentSlot.class).up().up()
                        this.arrayProperties.forEach ((property)=>{
                            if(currentSlot[property.propertyName])
                                property.xmlText(xml, currentSlot);
                        });

                        let xml_1= xml.ele('ul');
                        return this.slotsFinder(currentSlot.class).then(result=>{
                            return this.browseSlots(result.class.slots,result.doc.slots? result.doc.slots:[],xml_1).then((result_2)=>{
                                if(result.doc.slots == undefined) {
                                //console.log("The class "+result.class.module+"."+result.class.className+" does not have a documentation.");       
                                }
                                resolve();
                            });
                        });
                    } else {
                        xml.ele('strong', key + ':').up();
                        if (nowSlot){
                            if (nowSlot.description){
                                xml.ele('p', nowSlot.description).up();
                            }
                        }
                        let xml_2=xml.ele('ul')
                            .ele('li', 'Data Type: ')
                            .ele('a',{'href':'Data_Types.html#'+currentSlot.type},currentSlot.type).up().up();

                        if(nowSlot){
                            if(currentSlot.enumValues){
                                    this.browseValues(currentSlot,nowSlot, xml);
                                    this.ref++;
                            }
                        }

                        this.slotProperties.forEach((property) => {
                            if (currentSlot[property.propertyName]) {
                                if (property.propertyFunction)
                                    property.propertyFunction(currentSlot);

                                property.xmlText(xml_2, currentSlot);
                            }
                        });
                        xml_2.up();
                        resolve();
                    }
                } else if (typeof(currentSlot) == 'object') {
                    let xml_3 = xml.ele('h3', 'Group: '+ key).up();
                    if (nowSlot.description) {
                        xml_3.ele('p', nowSlot.description);
                        } else {
                            //console.log("The slotGroup "+key+" has no description.");
                        }          
                    this.groupProperties.forEach((property)=>{
                        if(currentSlot[property.propertyName])
                            property.xmlText(xml_3, currentSlot);
                    });
                    return this.browseSlots(currentSlot, nowSlot, xml_3).then(resolve,reject);
                } else {
                    resolve();
                }
            }));
        }
        return Promise.all(steps);
    }

    HTMLgenerator(module_filename, comm_line_arg,version){

        return this.slotsFinder(module_filename).then(result=>{
           
            let exampleObj = {longDescription: result.class.longDescription, objectId: uuid.v4(), revisionId: this.randomGenerator(), shortDescription: result.class.shortDescription};

            return this.objectCreator(result.class.slots,result.doc.slots? result.doc.slots:[], exampleObj).then(()=>{
                
                let xml = builder.create('html')        
                    .ele('body')
                    .ele('h1', result.class.className).up()
                    .ele('h5','Version: ' + version).up();
                    if(result.doc.description){
                        xml.ele('p', result.doc.description).up();
                    } else {
                        //console.log("The class "+result.class.module+'.'+result.class.className+" does not have a description.");
                    }

                    this.classProperties.forEach((property)=>{
                        if (result.class[property.propertyName])
                            property.xmlText(xml, result.class);                      
                    });

                    xml.ele('h3','Sample: ').up()
                    .ele('pre')
                    .ele('code', {'class':'json'}, JSON.stringify(exampleObj,null,4)).up().up()
                    .ele('h2', 'Properties: ').up();

                xml.up().end({ pretty: true});
                return this.browseSlots(result.class.slots,result.doc.slots? result.doc.slots:[],xml).then(()=>{ 
                    if (result.doc.slots == undefined) {
                        //console.log("The class "+result.class.module+'.'+result.class.className+" does not have a documentation.");       
                    }
                    return this.XMLtoString('./doc_head.xml').then((XMLstring) => {
                        let file = module_filename+'.html'; 
                        let dir = path.parse(comm_line_arg[2]).dir + "/Classes_Doc/";
                        if (!fs.existsSync(dir)){
                            fs.mkdirSync(dir);
                        }
                        let dir_2 = dir + path.parse(module_filename).name+"/";
                        if(!fs.existsSync(dir_2)){
                            fs.mkdirSync(dir_2);
                        }
                        if(fs.existsSync(dir_2+file)){
                            fs.truncateSync(dir_2+file, 0);
                        }
                        fs.appendFileSync(dir_2+file, XMLstring + xml);
                        return true;
                    });
                });
            });
        });
    }

    getFilesInPath(_path,choice){

        return new Promise((resolve, reject) => {
            fs.readdir(_path,function(err,files){
                if(err){
                    throw err;
                }
                resolve(files.map(function(file){
                    return path.join(_path,file);
                }).filter(function(file){
                    if(choice == 'directory'){
                        return fs.statSync(file).isDirectory();
                    }else{
                        return fs.statSync(file).isFile() && file.endsWith(".xml");
                    }
                }));
            })
        });
    }
}

let args = process.argv;
let p = args[2];

let doc_Generator = new DocGenerator();
doc_Generator.getFilesInPath(p,'directory').then((modules) => {
    modules.forEach((modul) => {
        return doc_Generator.getFilesInPath(modul,'directory').then((versions)=>{
            versions.forEach((version) =>{
                // TODO: versions must be retrieved from package.json, not always highest version.
                versions[0] = path.parse(versions[0]).base;
                let max = versions[0];
                for(let i=1;i<versions.length;i++){
                    versions[i] = path.parse(versions[i]).base;
                    if(versions[i]>max){
                        max = versions[i];
                    }    
                }
                version = path.parse(version).base;
                if(version.match(/\d/) && version == max ){
                    version = path.join(modul,version);
                    let directory = path.join(version,"classes");
                    if (fs.existsSync(directory)){
                        fs.statSync(directory);
                        doc_Generator.moduleList[path.parse(modul).base] = version;
                        return doc_Generator.getFilesInPath(directory,'file').then((classes)=>{
                            classes.forEach((_class)=>{
                                _class = path.parse(_class);
                                let mod = path.parse(modul);
                                let name = mod.base+'.'+ _class.name;
                                let vers = path.parse(version).base;
                                return doc_Generator.HTMLgenerator(name,args,vers);
                            });
                        });
                    } else {
                        Promise.resolve();
                    }
                } 
            });
        });
    });
});
