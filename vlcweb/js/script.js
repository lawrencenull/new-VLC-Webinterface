/* Author: Craig Anderson

 */
    var baseUrl = '';//document.baseURI.substring(0, document.baseURI.indexOf('/',8));
    var vlc = new Vlc(baseUrl);

$( function() {


    
    var currentStatus = {};
    
    function updateStatus(status)
    {
      currentStatus = status;
      
      $('#length').html(utilities.formatTime(status.length));
      $('#time').html(utilities.formatTime(status.time) + ' / ' + utilities.formatTime(status.length));
      
      $('#playback-slider').slider('option', { 
        max: parseInt(status.length), 
        value: parseInt(status.time) 
      });
    };
    
    function getCurrentId() {
      var currentId = null;
      $('#playlist tbody tr').each(function(){
        var playlistItem = $(this).metadata();
        if(playlistItem.current)
          currentId = playlistItem.id;
      });
      return currentId;
    }
    
    
    /*************** Controls *************/
    $('#btn_stop')
      .button({ icons: {primary:'ui-icon-stop'}, text: false})
      .click(function(){
        vlc.stop()
        $('#btn_pause, #btn_unpause').hide();
        $('#btn_play').show();
      });

    $('#btn_play')
      .button({ icons: {primary:'ui-icon-play'}, text: false})
      .click(function(){
        var id = getCurrentId();
        if(id != null)        
        {
          vlc.play(id, updatePlaylist);
          $(this).hide();
          $('#btn_pause').show();
        }       
      });
      
    $('#btn_pause')
      .button({ icons: {primary:'ui-icon-pause'}, text: false})
      .click(function(){
        vlc.pause(getCurrentId());
        $(this).hide();
        $('#btn_unpause').show();
      });    
      
    $('#btn_unpause')
      .button({ icons: {primary:'ui-icon-play'}, text: false})
      .click(function(){
        vlc.pause(getCurrentId());
        $(this).hide();
        $('#btn_pause').show();
      });
      
    $('#btn_previous')
      .button({ icons: {primary:'ui-icon-seek-prev'}, text: false})
      .click(function(){
        vlc.previous(updatePlaylist);
      });
    $('#btn_next')
      .button({ icons: {primary:'ui-icon-seek-next'}, text: false})
      .click(function(){
        vlc.next(updatePlaylist);
      });
    $('#btn_fullscreen')
      .button({ icons: {primary:'ui-icon-extlink'}, text: false})
      .click(function(){
        vlc.fullscreen();
      });
    $('#btn_volume_down')
      .button({ icons: {primary:'ui-icon-volume-on', secondary: 'ui-icon-minus'}, text: false})
      .click(function(){
        vlc.volumedown();
      });
    $('#btn_volume_up')
      .button({ icons: {primary:'ui-icon-volume-on', secondary: 'ui-icon-plus'}, text: false})
      .click(function(){
        vlc.volumeup();
      });    
    
    $('#volume-slider').slider({
      orientation: 'vertical',
      slide: function(event, ui) {
        vlc.setVolume(ui.value);
      }
    });
    
    $('#btn_setVolume')
      .button({ icons: {primary:'ui-icon-volume-on'}, text: false})
      .click(function(){
          $('#volume-popup').show();
          $('#volume-slider .ui-slider-handle').focus();
       });
    
    $('#volume-slider .ui-slider-handle').blur(function(){ $('#volume-popup').hide();});
    
    $('#playback-slider').slider({
      start: function(event, ui) {
        vlc.stopPollingStatus();
      },
      stop: function(event, ui) {
        vlc.seek(ui.value);
        vlc.startPollingStatus(updateStatus);
      },
      change: function(event, ui) {
        if(ui.value == $('#playback-slider').slider('option', 'max')-1){
          setTimeout(function(){
            vlc.getCurrentPlaylist(updatePlaylist);}, 1000);
        }
      }
    });
    /*************** End Controls *************/

        
    
    
    
    
    
    
    
    
    /************ Playlist & File Browser **********/
    
    function updatePlaylist(playlist)
    {
      var tbody = $('#playlist tbody');
      tbody.html('');
      
      var playlistItems = playlist.getItems();
      if(playlistItems.length === 0)
      {
        $('#btn_pause, #btn_unpause').hide();
        $('#btn_play').show();       
      }
      $(playlistItems).each(function(){
        var playlistItem = this;
        var metadata = $.toJSON(playlistItem);
        var currentClass = playlistItem.current ? "current" : "";
        tbody.append(
                 "<tr class='" + metadata + " " + currentClass +"'>" + 
                    '<td>' + playlistItem.name + '</td>' + 
                    '<td class="small">' + utilities.formatTime(playlistItem.length, true) + '</td>' + 
                    '<td class="actions small">' + '<a class="removeFromPlaylist ui-icon ui-icon-closethick"></a></td>' +                    
                  '</tr>');
      });
    }
    
    $('#btn_openFileBrowser')
      //.button({ icons: {primary:'ui-icon-eject'}, text: false})
      .click(function(){
        if(!fileBrowser.currentDir)
          fileBrowser.currentDir = '~';
        fileBrowser.open(fileBrowser.currentDir);
      });
      
    var fileBrowserElements = {
      dir:   '<li class="directory"><span href="#" class="ui-icon ui-icon-folder-collapsed"></span><a href="#" class="link"></a></li>',
      file:  '<li class="file"><span href="#" class="ui-icon ui-icon-document"></span><a href="#" class="link"></a></li>'
    };
    
    var fileBrowser = $('#file-browser');    
    var fileList = fileBrowser.find('ul');
    
    fileBrowser.currentDir = '~';
    fileBrowser.previousPath = '';
    fileBrowser.open = function(path){
      
        vlc.browse(path, function(directoryView){
          fileBrowser.previousPath = fileBrowser.currentDir;
          fileBrowser.currentDir = path;
          
          fileList.html('');
          $(directoryView.getItems({ type: 'directory' })).each(function(){
            var dir = $(fileBrowserElements.dir).clone()
                        .find('a')
                        .addClass($.toJSON(this))
                        .text(this.name)
                        .end();
            fileList.append(dir);
          });
          $(directoryView.getItems({ type: 'file' })).each(function(){
            var file = $(fileBrowserElements.file).clone()
                        .find('a')
                        .addClass($.toJSON(this))
                        .text(this.name)
                        .end();
            fileList.append(file);
          });
          
          if(fileList.find('li').length == 0){
            var dir = $(fileBrowserElements.dir).clone()
                        .find('a')
                        .addClass('{ path : "' + fileBrowser.previousPath + '"}')
                        .text('..')
                        .end();
            fileList.append(dir);
          }
            
          fileBrowser.show();
        });     
    }
    
    $('#file-browser li').live('click', function(eventObject){
        if (!$(eventObject.target).is('li'))
            return true;
        
        $(this).find('a').click();
    });
    
    $('#file-browser .directory a').live('click', function(){
        fileBrowser.open($(this).metadata().path);
      });
    
    $('#file-browser .file a').live('click', function(){
        fileBrowser.hide();
        var file = $(this).metadata();
        vlc.addToPlaylist(file.path, function(playlist){
           updatePlaylist(playlist);
         }, currentStatus.state == 'playing');
      });
    
    $('table#playlist tbody tr').live('click', function(){
      vlc.play($(this).metadata().id, function(playlist){
        updatePlaylist(playlist);
        $('#btn_play').hide();
        $('#btn_pause').show();
      });
    });
        
    $('.removeFromPlaylist').live('click', function(){
      var id = $(this).parents('tr').metadata().id;
      vlc.removeFromPlaylist(id, updatePlaylist);
      return false;
    });
      
    $('#btn_closeFileBrowser')
      .button({ icons: {primary:'ui-icon-closethick'}, text: false})
      .click(function(){
        fileBrowser.hide();
      });
    
    $('#btn_clearPlaylist')
      .click(function(){
        vlc.emptyPlaylist(updatePlaylist);
      });

    /************ End Playlist & File Browser **********/
    
     
    vlc.getCurrentStatus(function(status){
      if(status.state == 'playing'){
        $('#btn_play').hide();
        $('#btn_pause').show();       
      }
      else if(status.state == 'paused'){
        $('#btn_play').hide();
        $('#btn_unpause').show();       
      }
      $('#volume-slider').slider('option', { value: status.volume });
    });
    
    vlc.getCurrentPlaylist(updatePlaylist);    
    
    vlc.startPollingStatus(updateStatus);    
    
    
    $('#main').height(window.innerHeight - $('footer').outerHeight() - $('header').outerHeight());
    $(window).resize(function () {
      $('#main').height(window.innerHeight - $('footer').outerHeight() - $('header').outerHeight());
    });
});


