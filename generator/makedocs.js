var _ = require("underscore"),
    fs = require('fs'),
    Handlebars = require('handlebars'), 
   
   output_dir = 'gh-pages/',
   tpl_dir = 'gh-pages-tpl/',
   pages_dir = tpl_dir + 'pages/',
   layouts_dir = tpl_dir + 'layouts/',
   partials_dir = tpl_dir + 'partials/',
   
   files,
   layouts = {};
   

//helpers   
require('./helpers.js');

//load partials   
files = fs.readdirSync(partials_dir);   
files.forEach(function(item) {
    var name = item.replace('.hbs', ''),
        content = fs.readFileSync(partials_dir+item, 'utf8');
        
    Handlebars.registerPartial(name, content); 
    console.log('partial: '+name);       
});

//load layouts 
files = fs.readdirSync(layouts_dir); 
files.forEach(function(item) {
    var name = item.replace('.hbs', ''),
        content = fs.readFileSync(layouts_dir+item, 'utf8');
    
    layouts[name] = Handlebars.compile(content);    
    console.log('layout: '+name);       
});

//load context
var context = loadContext();
//return;                            

//generate pages
files = fs.readdirSync(pages_dir);
files.forEach(function(item) {
  var page = item.replace('.hbs', ''),
      output_file = output_dir + page + '.html',      
      content = fs.readFileSync(pages_dir+item, 'utf8'),
      layout = layouts['main'],
      html;
      
      Handlebars.registerPartial('layout_content', content);  
      context.page = page;
      html = layout(context);
      fs.writeFileSync(output_file, html);  
      console.log('page: '+ output_file);    
});

console.log('ok');

// ------------------------ functions ---------------------

function loadContext() {
    var context = require('./data/data.json'),
        classes = {}, news_content;
        
    context.project = require('../lib/package.json');
    //linebreaks in news json shoud be ended with \n to parse correctly
    context.news = JSON.parse(fs.readFileSync('./news.json').toString().replace(/\\n\s*\r?\n\s*/g, '\\n'));
    context.lastNews = context.news.shift();
    
    //group properties, methods, events
    classes = _.chain(context.classitems)
                   .filter(function(item) { return (item.class && item.itemtype); })
                   .groupBy('class')
                   .map(function(item, key){
//                      return [key, _.extend({name: key}, _.groupBy(item, 'itemtype'))]; 
                      return _.extend({name: key}, _.groupBy(item, 'itemtype'), context.classes[key]); 
                   })
                   //.object()
                   .value();
                   
    //convert to object                   
    classes =  _.chain(classes)    
                 .map(function(item){
                     return [item.name, item]; 
                 })
                 .object()
                 .value();
                 
    //merge defaults for main classes
    var exclude = ['editableform', 'editableContainer', 'editable'];
    mergeDefaults(classes.editableContainer, classes.editableform);
    mergeDefaults(classes.editable, classes.editableContainer);
    
    //merge 'cancel' event
    classes.editable.event.push(_.find(classes.editableContainer.event, function(item){ return item.name === 'cancel'; }));
    
    classes.editable.mainClass = true; 
    classes.editableContainer.mainClass = true; 
    
    var inputs = _.chain(classes)
                  .filter(function(item, key) {
                      return (_.indexOf(exclude, key) === -1) && (key !== 'abstract');
                  })
                  .map(function(item) {
                      mergeDefaults(item, classes.abstract);
                      return item;
                  })
                  .sortBy(function(item) {
                      return -item.name.charCodeAt(0);
                  })
               //   .object()
                  .value();
    
    //sort
    var sf = function(a,b) {return a.name > b.name ? 1 : -1;};
    _.each(['editableContainer', 'editable'], function(k) {
        classes[k].property.sort(sf); 
        classes[k].method.sort(sf); 
        classes[k].event.sort(sf); 
    });
        
    /*
    classes = _.chain(classes)
               .sortBy(function(item) { return exclude.indexOf(item.name); })
               .map(function(item) { 
                   var  c = context.classes[item.name],
                        uses = c.uses ? c.uses.slice() : [];
                        
                   if(c.extends) uses.unshift(c.extends);
                   
                   //iterate classes used by current class
                   _.each(uses, function(usedClass) {
                      //find used class object by name
                      var o = _.find(classes, function(item) {return item.name === usedClass;});
                      //iterate properties of used class
                      _.each(o.property, function(prop) {
                          //find property with the same name
                          var exist = _.find(item.property, function(p) { return p.name === prop.name; });
                          
                          //merge property to original class
                          if(exist) {   
                             _.extend(exist, _.extend({}, prop, exist));
                          } else {
                             item.property.push(prop); 
                          }
                      }); 
                   });
                   
                   return item;
               })
               .value();
   */            
//    console.log(classes);                             
  //  console.log(classes[5].property);                             
                         
                         /*
    for(var k in classes) {
        if(exclude.indexOf(k) !== -1) continue;
        var uses = context.classes[k].uses.slice(),
            options = classes[k].property.slice();
            alloptions = [];
            
        if(context.classes[k].extends) uses.unshift(context.classes[k].extends);
        
        uses.forEach(function(item) {
            alloptions = alloptions.concat(item.property);
        });
    }    
                           */
    
    context.myClasses = classes;   
    context.inputs = inputs;   
    
    return context;
}

function mergeDefaults(o, parent) {
    _.each(parent.property, function(prop) {
        if(prop.access === 'private') return;
        
        //find property with the same name
        var exist = _.find(o.property, function(p) { return p.name === prop.name; });

        //merge property to original class
        if(exist) {   
            _.extend(exist, _.extend({}, prop, exist));
        } else {
            o.property.push(prop); 
        }
    });
}