var arcService = {
    ogcOptions: {
        format: "image/png",
        transparent: true,
        exceptions: "application/vnd.ogc.se_inimage",
        srs: "EPSG:28992",
        version: "1.1.1",
        maptipids:"kanoroute,mtbroute,law_knelpt,lf_knelpt,regio_tvoost,biro2010,strooi_prov,bvb,kulturhus_mfa,top,energie_pro_biomassa,energie_pro_besparing,energie_pro_kwo,energie_pro_wind,energie_pro_zon,energie_pro_overig,stortplaats,asbest_loc,bouwarchief_niet_gem,bouwarchief_gem,bodemarchief,biro,rijkswegen,vaarwegen,provwegen,luchtkwaliteit_2008_N,luchtkwaliteit_2008_P,overijssel_geluid_lden_rijksw_2006,overijssel_geluid_lnight_rijksw_2006,overijssel_geluid_lden_provw_2006,overijssel_geluid_lnight_provw_2006,natlands,natpark,froutenetwerk,lfroute,lawroute,nat2000,rec_camping,rec_bungalowpark,rec_jachthaven,rec_groepsaccommodatie,recon_zone_polygon,wav_polygon,verzuur_polygon,waterwin_polygon,intrekgebied,grwbes_polygon,rayonwk_polygon,hemelhelderheid_polygon,wbe_polygon,ibis,watschap_ned_polygon,geomorfologie,LGN6,corop,habitattypen_id,ehs,rvz,evz,station,nb_wet,rijksmonumenten,gemeentelijkemonumenten,groenloket_natuurbeheertypen,groenloket_nieuwenatuur_beh,groenloket_nieuwenatuur_amb,groenloket_landschapselementen_beh,groenloket_agrbeh_weidevogel_beh,groenloket_agrbeh_botgrasland_beh,groenloket_agrbeh_botakkerland_beh,groenloket_ganzen_beh,groenloket_probleemgebieden,groenloket_schaapskudde_toeslag,groenloket_rvz_beh,groenloket_evz,groenloket_natuurbeheertypen_amb,groenloket_landschapselementen_amb,groenloket_agrbeh_weidevogel_amb,groenloket_agrbeh_botgrasland_amb,groenloket_agrbeh_botakkerland_amb,groenloket_ganzen_amb,groenloket_rvz_amb,groenloket_evz_amb,salland,boringvrij,fknooppunt,zwemwater_o,zwemwater_no,zwemwater_kand_o,zwemwater_kand_no,bag_pand,bag_adres,bag_ligplaats,bag_adres_ligplaats,bag_standplaats,bag_adres_standplaats,bag_verblijfsobject",
        styles: "",
        legend:"false",
        hidelegendids:"",
        backgroundcolor:"#fbfbfb",
        transcolor:"#fbfbfb",
        alpha:"85", 
        fullextent:"160000,457560,287864,543013", 
        identifydistance:"20", 
        maptipdistance:"20",
        id:"avo",
        name:"atlasoverijssel",
        timeout:"50", 
        server:"gisopenbaar.overijssel.nl", 
        servlet:"GeoJuli2008/ims",
        mapservice:"atlasoverijssel",
        visible:"true",
        hiddenids:"streetview,streetview_prov,acetate_streetview",
        // visibleids:"regio_tvoost",
        identifyall:"true",
        identifyids:"kanoroute,mtbroute,law_knelpt,lf_knelpt,regio_tvoost,biro2010,N340_bpEnkel,strooi_prov,bvb,kulturhus_mfa,top,energie_pro_biomassa,energie_pro_besparing,energie_pro_kwo,energie_pro_wind,energie_pro_zon,energie_pro_overig,stortplaats,asbest_loc,bouwarchief_niet_gem,bouwarchief_gem,bodemarchief,biro,rijkswegen,vaarwegen,provwegen,luchtkwaliteit_2008_N,luchtkwaliteit_2008_P,overijssel_geluid_lden_rijksw_2006,overijssel_geluid_lnight_rijksw_2006,overijssel_geluid_lden_provw_2006,overijssel_geluid_lnight_provw_2006,natlands,natpark,froutenetwerk,lfroute,lawroute,nat2000,rec_camping,rec_bungalowpark,rec_jachthaven,rec_groepsaccommodatie,recon_zone_polygon,wav_polygon,verzuur_polygon,waterwin_polygon,intrekgebied,grwbes_polygon,rayonwk_polygon,hemelhelderheid_polygon,wbe_polygon,ibis,watschap_ned_polygon,geomorfologie,LGN6,corop,habitattypen_id,ehs,rvz,evz,station,nb_wet,rijksmonumenten,gemeentelijkemonumenten,groenloket_natuurbeheertypen,groenloket_nieuwenatuur_beh,groenloket_nieuwenatuur_amb,groenloket_landschapselementen_beh,groenloket_agrbeh_weidevogel_beh,groenloket_agrbeh_botgrasland_beh,groenloket_agrbeh_botakkerland_beh,groenloket_ganzen_beh,groenloket_probleemgebieden,groenloket_schaapskudde_toeslag,groenloket_rvz_beh,groenloket_evz,groenloket_natuurbeheertypen_amb,groenloket_landschapselementen_amb,groenloket_agrbeh_weidevogel_amb,groenloket_agrbeh_botgrasland_amb,groenloket_agrbeh_botakkerland_amb,groenloket_ganzen_amb,groenloket_rvz_amb,groenloket_evz_amb,salland,boringvrij,fknooppunt,zwemwater_o,zwemwater_no,zwemwater_kand_o,zwemwater_kand_no,bag_pand,bag_adres,bag_ligplaats,bag_adres_ligplaats,bag_standplaats,bag_adres_standplaats,bag_verblijfsobject",
        noCache: false // TODO: Voor achtergrond kaartlagen wel cache gebruiken
    },
    options:{
        timeout: 30,
        retryonerror: 10,
        ratio: 1,
        showerrors: true,
        id: "avo",
        initService: true
    },
    service : "",
    server: "",
    mapservice:"",
    name :""
};