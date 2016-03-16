//-------------------------------------------------
//      Redpitaya analytics system
//      Created by Alexey Kaygorodov
//-------------------------------------------------

(function($) {
    var startUsing = 0;
    $(document).ready(function($) {
        AnalyticsCore.init(function() {
            AnalyticsCore.sendScreenView('/scopegenpro', 'Redpitaya', 'Oscilloscope Pro');
            AnalyticsCore.sendSysInfo('/scopegenpro');
            startUsing = performance.now();
        });
    });

    $(window).on('beforeunload', function(e) {
        AnalyticsCore.sendTiming('/scopegenpro', 'App executed', 'Oscilloscope Pro', performance.now() - startUsing);
        AnalyticsCore.sleep(2500);
    });

})(jQuery);
