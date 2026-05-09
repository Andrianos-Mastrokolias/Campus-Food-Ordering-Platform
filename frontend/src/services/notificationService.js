import emailjs from '@emailjs/browser';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.jsx';

/**
 * NotificationService
 * Sends real emails using EmailJS and also stores a Firestore log
 * so notifications can be verified during testing/demo.
 */
class NotificationService {
  constructor() {
    this.logCollectionName = 'emailNotifications';

    this.serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    this.orderReadyTemplateId = import.meta.env.VITE_EMAILJS_ORDER_READY_TEMPLATE_ID;
    this.adminTemplateId = import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID;
    this.publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    this.adminEmail = import.meta.env.VITE_ADMIN_NOTIFICATION_EMAIL;

    console.log("EMAILJS ENV DEBUG:", {
    serviceId: this.serviceId,
    templateId: this.orderReadyTemplateId,
    publicKey: this.publicKey,
    adminEmail: this.adminEmail
  });
  }

  async logNotification(notificationData) {
    await addDoc(collection(db, this.logCollectionName), {
      ...notificationData,
      createdAt: serverTimestamp()
    });
  }

  async sendOrderReadyEmail(order) {
    if (!order.studentEmail) {
      throw new Error('Student email is missing, so order-ready email cannot be sent.');
    }

    const templateParams = {
      to_email: order.studentEmail,
      student_name: order.studentName || 'Student',
      order_id: order.id?.slice(0, 6) || 'N/A',
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

  async sendAdminVendorChangeRequestEmail(request) {
    if (!this.adminEmail) {
      throw new Error('Admin notification email is missing from .env.');
    }

    const templateParams = {
      to_email: this.adminEmail,
      vendor_name: request.vendorName || 'Vendor',
      vendor_email: request.vendorEmail || 'No email provided',
      name: 'Campus Food Ordering Platform',
      email: request.vendorEmail || this.adminEmail
    };

    await emailjs.send(
      this.serviceId,
      this.adminTemplateId,
      templateParams,
      this.publicKey
    );

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
  if (!this.adminEmail) {
    throw new Error('Admin notification email is missing from .env.');
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

  await emailjs.send(
    this.serviceId,
    this.adminTemplateId,
    templateParams,
    this.publicKey
  );

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
  if (!this.adminEmail) {
    throw new Error('Admin notification email is missing from .env.');
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

  await emailjs.send(
    this.serviceId,
    this.adminTemplateId,
    templateParams,
    this.publicKey
  );

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