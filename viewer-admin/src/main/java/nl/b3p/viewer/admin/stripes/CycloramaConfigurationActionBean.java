/*
 * Copyright (C) 2014 B3Partners B.V.
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
package nl.b3p.viewer.admin.stripes;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.Key;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;
import java.util.Enumeration;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import net.sourceforge.stripes.action.ActionBean;
import net.sourceforge.stripes.action.ActionBeanContext;
import net.sourceforge.stripes.action.DefaultHandler;
import net.sourceforge.stripes.action.FileBean;
import net.sourceforge.stripes.action.ForwardResolution;
import net.sourceforge.stripes.action.Resolution;
import nl.b3p.viewer.config.CycloramaAccount;
import org.apache.commons.codec.binary.Base64;
import org.stripesstuff.stripersist.Stripersist;
import sun.security.rsa.RSAPrivateCrtKeyImpl;

/**
 *
 * @author Meine Toonen
 */
public class CycloramaConfigurationActionBean implements ActionBean {

    private final String CERT_TYPE = "PKCS12";
    private final String KEY_FORMAT = "PKCS#8";

    private ActionBeanContext context;
    private final String JSP = "/WEB-INF/jsp/services/cyclorama.jsp";

    private String username;
    private String password;
    private FileBean key;

    // <editor-fold desc="Getters and setters" defaultstate="collapsed">
    @Override
    public void setContext(ActionBeanContext abc) {
        this.context = abc;
    }

    @Override
    public ActionBeanContext getContext() {
        return context;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public FileBean getKey() {
        return key;
    }

    public void setKey(FileBean key) {
        this.key = key;
    }

    // </editor-fold>
    @DefaultHandler
    public Resolution view() {
        return new ForwardResolution(JSP);
    }

    public Resolution save() throws KeyStoreException {

        try {
            String privateBase64Key = getBase64EncodedPrivateKeyFromPfxUpload(key.getInputStream(), password);
            int a = 0;
            CycloramaAccount account = new CycloramaAccount();
            account.setFilename(key.getFileName());
            account.setUsername(username);
            account.setPassword(password);
            account.setPrivateBase64Key(privateBase64Key);
            EntityManager em = Stripersist.getEntityManager();
            em.persist(account);
            em.getTransaction().commit();

        } catch (IOException ex) {
            Logger.getLogger(CycloramaConfigurationActionBean.class.getName()).log(Level.SEVERE, null, ex);
        } catch (NoSuchAlgorithmException ex) {
            Logger.getLogger(CycloramaConfigurationActionBean.class.getName()).log(Level.SEVERE, null, ex);
        } catch (CertificateException ex) {
            Logger.getLogger(CycloramaConfigurationActionBean.class.getName()).log(Level.SEVERE, null, ex);
        } catch (UnrecoverableKeyException ex) {
            Logger.getLogger(CycloramaConfigurationActionBean.class.getName()).log(Level.SEVERE, null, ex);
        }
        return new ForwardResolution(JSP);
    }

    private String getBase64EncodedPrivateKeyFromPfxUpload(InputStream in, String password)
            throws KeyStoreException, IOException, NoSuchAlgorithmException,
            CertificateException, UnrecoverableKeyException {

        String base64 = null;

        PrivateKey privateKey = null;

        KeyStore ks = java.security.KeyStore.getInstance(CERT_TYPE);
        ks.load(new BufferedInputStream(in), password.toCharArray());

        Enumeration<String> aliases = ks.aliases();

        while (aliases.hasMoreElements()) {
            String alias = aliases.nextElement();

            Key key = ks.getKey(alias, password.toCharArray());
            String keyFormat = key.getFormat();

            if ((key instanceof RSAPrivateCrtKeyImpl) && keyFormat.equals(KEY_FORMAT)) {
                privateKey = (PrivateKey) key;
            }
        }

        if (privateKey != null) {
            Base64 encoder = new Base64();
            base64 = new String(encoder.encode(privateKey.getEncoded()));
        }

        return base64;
    }
}
