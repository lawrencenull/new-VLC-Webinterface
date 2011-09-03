/* Author: Craig Anderson

 */

/************ Models ************/

var Status = function(){
  return {
    time:       0,
    length:     1,
    volume:     0,
    state:      '',
    position:   0,
    fullscreen: false,
    random:     0,
    loop:       0,
    repeat:     0   
  };
};

var PlaylistItem = function(item){
  if(item)
    return item;
    
  return {
    id:       -1,
    uri:      '',
    name:     '',
    length:   0,
    current:  false
  };
}

var Playlist = function(){
  var _items = new Array();
  
  return {
    name:   '',
    getItems:  function(){ return _items; },
    clear:  function(){
      _items.splice(0, _items.length);
    },
    addItem : function (item) {
      _items.push(item);
    }  
  }
}

var FileSystemItem = function(item){
  if(item){
    item.isDirectory = item.type == 'directory'
    return item;
  }
  
  return {
    type:     '',
    size:     0,
    name:     '',
    date:     '',
    path:     '',
    extension:''
  };
}

var DirectoryView = function(){
  var _items = new Array();
  
  return {
    name:   '',
    getItems:  function(search){
      
      var defaults = {
            type:     '',
            size:     0,
            name:     '',
            date:     '',
            path:     '',
            extension:'',
      };
      search = jQuery.extend({}, defaults, search);
      
      var items = new Array();
      $(_items).each(function(){
        if(search.type && this.type != search.type) return true;
        if(search.size && this.size != search.size) return true;
        if(search.name && this.name != search.name) return true;
        if(search.date && this.date != search.date) return true;
        if(search.path && this.size != search.path) return true;
        if(search.extension && this.extension != search.extension) return true;

        items.push(this);
      });
              
      return items;
    },
    clear:  function(){
      _items.splice(0, _items.length);
    },
    addItem : function (item) {
      _items.push(item);
    }  
  }  
}
/********************************/

/************ Parser ************/

var Parser = function(){
  var me = this;
  me.addslashes = 
      function ( str ){ return str.replace(/\'/g, '\\\''); }
  me.escapebackslashes =
      function ( str ){ return str.replace(/\\/g, '\\\\'); }


  return {
    parseStatusXml: function (data) {
      
      var statusXml = $(data);
      var status = new Status();
      
      var timetag = statusXml.find('time:first');
      if( timetag.length > 0 )
          status.time = timetag.text();
    
      var lengthtag = statusXml.find('length:first');
      if( lengthtag.length > 0 )
          status.length = lengthtag.text();
    
      positiontag = statusXml.find('position:first');
      if( length < 100 && positiontag.length > 0 )
          status.position = lengthtag.text() * 4;
      else if( length > 0 ) /* this is more precise if length > 100 */
          status.position = Math.floor( ( status.time * 400 ) / status.length );
    
      var volumetag = statusXml.find('volume:first');
      if( volumetag.length != 0 )
          status.volume = Math.floor(volumetag.text()/5.12);

      var statetag = statusXml.find( 'state:first' );
      if( statetag.length > 0 )
          status.state = statetag.text();
    
      var randomtag = statusXml.find( 'random:first' );
      status.random = randomtag.length > 0 ? randomtag.text() == "1" : false;
    
      var looptag = statusXml.find( 'loop:first' );
      status.loop = looptag.length > 0 ? looptag.text() == "1" : false;
    
      var repeattag = statusXml.find( 'repeat:first' );
      status.repeat = repeattag.length > 0 ? repeattag.text() == "1" : false;
      
      return status;
    },
    parsePlaylistXml: function (data) {    
      function extractName(name){
        var s = name.split('\\');
        if(s.length == 0)
          s = name.split('/');
        if(s.length > 0)
          return s[s.length-1];
        else
          return name;
      }
      
      var playlist = new Playlist();
  
      var playlistXml = $(data).find('[name=Playlist]');
      
      playlistXml.find('leaf').each(function(){
        
        var $this = $(this);
        
        playlist.addItem(
          new PlaylistItem({
          
            id: $this.attr('id'),
            uri: $this.attr('uri'),
            name: extractName($this.attr('name')),
            length: $this.attr('duration'),
            current: $this.attr('current') ? true : false
          }));
      });
      
      return playlist;
    },
    parseBrowseXml: function (data){

      var directoryView = new DirectoryView();
      
      $(data).find('element').each(function(){
          $element = $(this);
          
          directoryView.addItem(
            new FileSystemItem({
              type:     $element.attr('type'),
              size:     $element.attr('size'),
              name:     $element.attr('name'),
              date:     $element.attr('date'),
              extension:$element.attr('extension'),
              path:     me.addslashes(me.escapebackslashes($element.attr('path')))
            }));
      });
      
      return directoryView;
    },
    addSlashes: me.addslashes,
    escapeBackslashes: me.escapebackslashes
  }
}
/********************************/

function Vlc(baseUrl){
  
  var parser = new Parser();
   
  function requestPlaylist(updatePlaylist, delay)
  {
    if(delay == null)
      delay = 1000;
         
    setTimeout(function(){
      $.get(baseUrl + '/requests/playlist.xml', function(data){
          var playlist = parser.parsePlaylistXml(data);
          if($.isFunction(updatePlaylist))
            updatePlaylist(playlist);
        });
    }, delay);
  }
  

  var statusIntervalId = -1;






  return {
    startPollingStatus: function(updateCurrentStatus){
      clearInterval(statusIntervalId);
      statusIntervalId = 
        setInterval(function(){
            $.get(baseUrl + '/requests/status.xml', function(data){
                var status = parser.parseStatusXml(data);
                if($.isFunction(updateCurrentStatus))
                  updateCurrentStatus(status);
              });     
          }, 1000);
    },
    stopPollingStatus: function(){
      clearInterval(statusIntervalId);
    },
    getCurrentStatus: function(updateCurrentStatus){
      if($.isFunction(updateCurrentStatus))
        $.get(baseUrl + '/requests/status.xml', function(data){
            var status = parser.parseStatusXml(data);
            updateCurrentStatus(status);
          });
    },
    getCurrentPlaylist: function(updatePlaylist){
      requestPlaylist(updatePlaylist, 0);
    },
    play: function(id, updatePlaylist){
      $.get(baseUrl + '/requests/status.xml?command=pl_play&id='+id, function(){
        requestPlaylist(updatePlaylist);        
      });
    },
    pause: function(id){
      $.get(baseUrl + '/requests/status.xml?command=pl_pause&id='+id );
    },
    stop: function(){
      $.get(baseUrl + '/requests/status.xml?command=pl_stop' );
    },
    seek: function (pos) {
      $.get(baseUrl + '/requests/status.xml?command=seek&val='+pos );
    },
    fullscreen: function(){
      $.get(baseUrl + '/requests/status.xml?command=fullscreen' );
    },
    setVolume: function(level){
      level = Math.floor(level * 5.12);
      $.get(baseUrl + '/requests/status.xml?command=volume&val=' + level );
    },
    volumeup: function(){
      $.get(baseUrl + '/requests/status.xml?command=volume&val=%2B20' );
    },
    volumedown: function(){
      $.get(baseUrl + '/requests/status.xml?command=volume&val=-20' );
    },
    next: function(updatePlaylist){
      $.get(baseUrl + '/requests/status.xml?command=pl_next', function(){
        requestPlaylist(updatePlaylist);        
      });
    },
    previous: function(updatePlaylist){
      $.get(baseUrl + '/requests/status.xml?command=pl_previous', function(){
        requestPlaylist(updatePlaylist);        
      });
    },
    browse: function(dir, updateDirectoryList){
      $.get(baseUrl + '/requests/browse.xml?dir='+encodeURIComponent(dir),
        function(data){
          var directoryView = parser.parseBrowseXml(data);
          if($.isFunction(updateDirectoryList))
            updateDirectoryList(directoryView);
        });
    },
    addToPlaylist: function(path, updatePlaylist, isPlaying){
      $.get(baseUrl + '/requests/status.xml?command=in_enqueue&input='+encodeURIComponent(parser.addSlashes(parser.escapeBackslashes(path))),
          function(){
            if(isPlaying)
                requestPlaylist(updatePlaylist, 2000);
            else{
              $.get(baseUrl + '/requests/status.xml?command=pl_play', function(){
                      $.get(baseUrl + '/requests/status.xml?command=pl_stop', function(){
                        requestPlaylist(updatePlaylist);        
                      });      
                    });
            }
          });
    },
    removeFromPlaylist: function(id, updatePlaylist){
      $.get(baseUrl + '/requests/status.xml?command=pl_delete&id='+id, function(){
        requestPlaylist(updatePlaylist);        
      });      
    },
    emptyPlaylist: function(updatePlaylist){
      $.get(baseUrl + '/requests/status.xml?command=pl_empty', function(){
        requestPlaylist(updatePlaylist);        
      });      
    }
  };
};