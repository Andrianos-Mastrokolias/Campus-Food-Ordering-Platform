import emailjs from '@emailjs/browser';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.jsx';

/**
 * NotificationService
 * Sends real emails using EmailJS and stores notification logs in Firestore.
 */
class NotificationService {
  constructor() {
    this.logCollectionName = 'emailNotifications';

    this.serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    this.orderReadyTemplateId = import.meta.env.VITE_EMAILJS_ORDER_READY_TEMPLATE_ID;
    this.adminTemplateId = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID;
    this.publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    this.adminEmail = import.meta.env.VITE_ADMIN_NOTIFICATION_EMAIL;
  }

  validateEmailJsConfig(templateId) {
    if (!this.serviceId) throw new Error('Missing VITE_EMAILJS_SERVICE_ID');
    if (!templateId) throw new Error('Missing EmailJS template ID');
    if (!this.publicKey) throw new Error('Missing VITE_EMAILJS_PUBLIC_KEY');
  }

  async logNotification(notificationData) {
    try {
      await addDoc(collection(db, this.logCollectionName), {
        ...notificationData,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Email was sent, but Firestore notification log failed:', error);
    }
  }

  async sendOrderReadyEmail(order) {
  this.validateEmailJsConfig(this.orderReadyTemplateId);

  if (!order.studentEmail) {
    throw new Error('Student email is missing. Place a new order so studentEmail is stored on the order.');
  }

  const templateParams = {
    to_email: order.studentEmail,
    recipient_name:
      order.studentName ||
      order.studentEmail ||
      'Student',

    email_subject: 'Your order is ready for collection',

    email_title: 'Your order is ready for collection',

    email_message:
      `Your order #${order.id?.slice(0, 6) || 'N/A'} is ready for collection.`,

    name: 'Campus Food Ordering Platform',
    email: this.adminEmail || order.studentEmail
  };

  await emailjs.send(
    this.serviceId,
    this.orderReadyTemplateId,
    templateParams,
    this.publicKey
  );

  await this.logNotification({
    type: 'order_ready',
    toEmail: order.studentEmail,
    subject: 'Your order is ready for collection',
    orderId: order.id,
    vendorId: order.vendorId,
    studentId: order.studentId || null,
    status: 'sent'
  });

  return true;
}

async sendVendorApprovedEmail(vendorData) {
  this.validateEmailJsConfig(this.orderReadyTemplateId);

  if (!vendorData.email) {
    throw new Error('Vendor email is missing.');
  }

  const templateParams = {
    to_email: vendorData.email,

    recipient_name:
      vendorData.name ||
      vendorData.businessName ||
      vendorData.email ||
      'Vendor',

    email_subject: 'Your vendor account has been approved',

    email_title: 'Vendor account approved',

    email_message:
      `Your vendor account has been verified and approved. Your shop number is ${vendorData.shopNumber || 'N/A'}. You can now access the vendor dashboard.`,

    name: 'Campus Food Ordering Platform',
    email: this.adminEmail || vendorData.email
  };

  await emailjs.send(
    this.serviceId,
    this.orderReadyTemplateId,
    templateParams,
    this.publicKey
  );

  await this.logNotification({
    type: 'vendor_approved',
    toEmail: vendorData.email,
    subject: 'Vendor account approved',
    vendorId: vendorData.vendorId || null,
    status: 'sent'
  });

  return true;
}

  async sendAdminVendorChangeRequestEmail(request) {
    this.validateEmailJsConfig(this.adminTemplateId);

    if (!this.adminEmail) {
      throw new Error('Admin notification email is missing from environment variables.');
    }

    const templateParams = {
      to_email: this.adminEmail,
      vendor_name: request.vendorName || 'Vendor',
      vendor_email: request.vendorEmail || 'No email provided',
      name: 'Campus Food Ordering Platform',
      email: request.vendorEmail || this.adminEmail
    };

    await emailjs.send(this.serviceId, this.adminTemplateId, templateParams, this.publicKey);

    await this.logNotification({
      type: 'vendor_detail_change_request',
      toEmail: this.adminEmail,
      subject: 'Vendor detail change request submitted',
      requestId: request.id || null,
      vendorId: request.vendorId,
      vendorEmail: request.vendorEmail || null,
      status: 'sent'
    });

    return true;
  }

  async sendAdminVendorApplicationEmail(application) {
    this.validateEmailJsConfig(this.adminTemplateId);

    if (!this.adminEmail) {
      throw new Error('Admin notification email is missing from environment variables.');
    }

    const templateParams = {
      to_email: this.adminEmail,
      vendor_name:
        application.businessName ||
        application.vendorName ||
        application.name ||
        'Vendor Applicant',
      vendor_email:
        application.email ||
        application.vendorEmail ||
        'No email provided',
      name: 'Campus Food Ordering Platform',
      email: application.email || this.adminEmail
    };

    await emailjs.send(this.serviceId, this.adminTemplateId, templateParams, this.publicKey);

    await this.logNotification({
      type: 'vendor_application',
      toEmail: this.adminEmail,
      subject: 'New vendor application submitted',
      applicantEmail: application.email || null,
      status: 'sent'
    });

    return true;
  }

  async sendAdminAccessRequestEmail(application) {
    this.validateEmailJsConfig(this.adminTemplateId);

    if (!this.adminEmail) {
      throw new Error('Admin notification email is missing from environment variables.');
    }

    const templateParams = {
      to_email: this.adminEmail,
      vendor_name:
        application.name ||
        application.userName ||
        'Admin Applicant',
      vendor_email:
        application.email ||
        'No email provided',
      name: 'Campus Food Ordering Platform',
      email: application.email || this.adminEmail
    };

    await emailjs.send(this.serviceId, this.adminTemplateId, templateParams, this.publicKey);

    await this.logNotification({
      type: 'admin_access_request',
      toEmail: this.adminEmail,
      subject: 'New admin access request submitted',
      applicantEmail: application.email || null,
      status: 'sent'
    });

    return true;
  }
}

export default new NotificationService();