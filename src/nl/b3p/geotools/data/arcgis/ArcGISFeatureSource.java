/*
 * Copyright (C) 2012 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
package nl.b3p.geotools.data.arcgis;

import com.vividsolutions.jts.geom.*;
import java.io.IOException;
import java.util.Date;
import org.geotools.data.FeatureReader;
import org.geotools.data.Query;
import org.geotools.data.QueryCapabilities;
import org.geotools.data.store.ContentEntry;
import org.geotools.data.store.ContentFeatureSource;
import org.geotools.feature.simple.SimpleFeatureTypeBuilder;
import org.geotools.geometry.jts.ReferencedEnvelope;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.feature.simple.SimpleFeatureType;
import org.opengis.filter.sort.SortBy;

/**
 *
 * @author Matthijs Laan
 */
public class ArcGISFeatureSource extends ContentFeatureSource {
 
    /**
     * Geometry attribute name for when it isn't in the JSON layer description
     * field list.
     */
    public static final String DEFAULT_GEOMETRY_ATTRIBUTE_NAME = "geometry";
    
    public ArcGISFeatureSource(ContentEntry ce) {
        super(ce, null);
    }    

    @Override
    public QueryCapabilities buildQueryCapabilities() {        
        return new QueryCapabilities() {
            @Override
            public boolean isJoiningSupported() {
                return false;
            }
            
            @Override
            public boolean isOffsetSupported() {
                return true;
            }
            
            @Override
            public boolean isReliableFIDSupported() {
                return true;
            }
            
            @Override
            public boolean isVersionSupported() {
                return false;
            }
            
            @Override 
            public boolean supportsSorting(SortBy[] attributes) {
                return false;
            }                    
        };       
    }
    
    @Override
    protected boolean canFilter() {
        return true;
    }        
    
    @Override
    protected boolean canLimit() {
        return true;
    }
    
    @Override
    protected boolean canOffset() {
        return true;
    }
    
    protected ArcGISDataStore getArcGISDataStore() {
        return (ArcGISDataStore)getDataStore();
    }
    
    @Override
    protected ReferencedEnvelope getBoundsInternal(Query query) throws IOException {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    @Override   
    protected int getCountInternal(Query query) throws IOException {
        return new ArcGISFeatureReader(this, query).getCount();
    }

    @Override
    protected FeatureReader<SimpleFeatureType, SimpleFeature> getReaderInternal(Query query) throws IOException {
        return new ArcGISFeatureReader(this, query);
    }

    @Override
    protected SimpleFeatureType buildFeatureType() throws IOException {       
        JSONObject layer = getArcGISDataStore().getLayerJSON(entry.getTypeName());
        
        SimpleFeatureTypeBuilder b = new SimpleFeatureTypeBuilder();
        b.setName(entry.getTypeName());       
        
        JSONArray fields = (JSONArray)layer.get("fields");

        for(Object o: fields) {
            JSONObject f = (JSONObject)o;

            Class binding = getBinding((String)f.get("type"));

            // Sometimes there is a field of type esriFieldTypeGeometry            
            if(binding.equals(Geometry.class)) {
                
                // check layer geometry type
                binding = getGeometryBinding((String)layer.get("geometryType"));
                b.add((String)f.get("name"), binding, getArcGISDataStore().getCRS());
            } else {
                b.add((String)f.get("name"), binding);
            }
        }
       
        // If there wasn't a field with type esriFieldTypeGeometry, create a
        // default geometry according to the geometryType property of the layer
        if(b.getDefaultGeometry() == null) {
            Class binding = getGeometryBinding((String)layer.get("geometryType"));
            b.add(DEFAULT_GEOMETRY_ATTRIBUTE_NAME, binding, getArcGISDataStore().getCRS());
        }
        return b.buildFeatureType();
    }

    private Class getGeometryBinding(String esriGeometryType) {
        // These are the only geometry types which have a JSON syntax described 
        // in the API docs.
        if("esriGeometryPolyline".equals(esriGeometryType)) {
            return MultiLineString.class;
        } else if("esriGeometryMultipoint".equals(esriGeometryType)) {
            return MultiPoint.class;
        } else if("esriGeometryPoint".equals(esriGeometryType)) {
            return Point.class;
        } else if("esriGeometryPolygon".equals(esriGeometryType)) {
            return Polygon.class;
        } else {
            throw new IllegalArgumentException("geometryType not supported: " + esriGeometryType);
        }        
    }
    
    private Class getBinding(String esriType) {
        
        if(esriType.equals("esriFieldTypeGeometry")) {
            return Geometry.class;
        } else if(esriType.equals("esriFieldTypeDate")) {
            return Date.class;
        } else if(esriType.equals("esriFieldTypeDouble")) {
            return Double.class;
        } else if(esriType.equals("esriFieldTypeGUID")) {
            return String.class;
        } else if(esriType.equals("esriFieldTypeGlobalID")) {
            return String.class;
        } else if(esriType.equals("esriFieldTypeInteger")) {
            return Integer.class;
        } else if(esriType.equals("esriFieldTypeOID")) {
            return Integer.class;
        } else if(esriType.equals("esriFieldTypeSingle")) {
            return Float.class;
        } else if(esriType.equals("esriFieldTypeSmallInteger")) {
            return Integer.class;
        } else if(esriType.equals("esriFieldTypeString")) {
            return String.class;
        } else {
            return String.class;
        }
    }
}
