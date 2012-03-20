/*
 * Copyright (C) 2012 Expression organization is undefined on line 4, column 61 in Templates/Licenses/license-gpl30.txt.
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
package nl.b3p.geotools.data.arcims;

import java.util.List;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;

/**
 *
 * @author matthijsln
 */
@XmlAccessorType(XmlAccessType.FIELD)
public class AxlFClass {
    public static final String TYPE_POINT = "point";
    public static final String TYPE_POLYGON = "polygon";
    public static final String TYPE_LINE = "line";
    
    @XmlAttribute
    private String type;
    
    @XmlElement(name="ENVELOPE")
    private AxlEnvelope envelope;
    
    @XmlElement(name="FIELD")
    private List<AxlFieldInfo> fields;

    public AxlEnvelope getEnvelope() {
        return envelope;
    }

    public void setEnvelope(AxlEnvelope envelope) {
        this.envelope = envelope;
    }

    public List<AxlFieldInfo> getFields() {
        return fields;
    }

    public void setFields(List<AxlFieldInfo> fields) {
        this.fields = fields;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
